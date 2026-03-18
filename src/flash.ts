import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType
} from "@codemirror/view";
import type { FlashNavSettings } from "./settings";

let activeSettings: FlashNavSettings = {
  labelAlphabet: "asdfghjklqwertyuiopzxcvbnm",
  caseSensitive: false,
  smartCase: true,
  autoJumpSingleMatch: false,
  backdropOpacity: 52
};

type FlashMatch = {
  from: number;
  to: number;
  label?: string;
};

type FlashState = {
  active: boolean;
  pattern: string;
  matches: FlashMatch[];
  targetIndex: number;
};

const INACTIVE_STATE: FlashState = {
  active: false,
  pattern: "",
  matches: [],
  targetIndex: -1
};

type ReplaceStatePayload = {
  pattern: string;
  matches: FlashMatch[];
  targetIndex: number;
};

const startFlashEffect = StateEffect.define<void>();
const stopFlashEffect = StateEffect.define<void>();
const replaceFlashStateEffect = StateEffect.define<ReplaceStatePayload>();

class LabelWidget extends WidgetType {
  constructor(
    private readonly label: string,
    private readonly current: boolean
  ) {
    super();
  }

  eq(other: LabelWidget): boolean {
    return this.label === other.label && this.current === other.current;
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = this.current ? "flash-nav-label flash-nav-label-current" : "flash-nav-label";
    span.textContent = this.label;
    return span;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

const flashStateField = StateField.define<FlashState>({
  create() {
    return INACTIVE_STATE;
  },
  update(value, tr) {
    let next = value;

    for (const effect of tr.effects) {
      if (effect.is(startFlashEffect)) {
        next = {
          active: true,
          pattern: "",
          matches: [],
          targetIndex: -1
        };
      } else if (effect.is(stopFlashEffect)) {
        next = INACTIVE_STATE;
      } else if (effect.is(replaceFlashStateEffect)) {
        next = {
          active: true,
          pattern: effect.value.pattern,
          matches: effect.value.matches,
          targetIndex: effect.value.targetIndex
        };
      }
    }

    return next;
  },
  provide: (field) =>
    EditorView.decorations.from(field, (state) => {
      if (!state.active) {
        return Decoration.none;
      }

      const builder = new RangeSetBuilder<Decoration>();
      const ranges: Array<{
        from: number;
        to: number;
        startSide: number;
        decoration: Decoration;
      }> = [];

      for (let i = 0; i < state.matches.length; i += 1) {
        const match = state.matches[i];
        if (!match) {
          continue;
        }
        const isCurrent = i === state.targetIndex;
        const markClass = isCurrent ? "flash-nav-match flash-nav-match-current" : "flash-nav-match";

        ranges.push({
          from: match.from,
          to: match.to,
          startSide: 0,
          decoration: Decoration.mark({ class: markClass })
        });

        if (match.label) {
          ranges.push({
            from: match.to,
            to: match.to,
            startSide: 1,
            decoration: Decoration.widget({
              widget: new LabelWidget(match.label, isCurrent),
              side: 1
            })
          });
        }
      }

      ranges.sort((a, b) => {
        if (a.from !== b.from) {
          return a.from - b.from;
        }
        if (a.startSide !== b.startSide) {
          return a.startSide - b.startSide;
        }
        return a.to - b.to;
      });

      for (const range of ranges) {
        builder.add(range.from, range.to, range.decoration);
      }

      return builder.finish();
    })
});

function isPrintableKey(event: KeyboardEvent): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey;
}

function findVisibleMatches(view: EditorView, pattern: string): FlashMatch[] {
  if (pattern.length === 0) {
    return [];
  }

  const shouldUseCaseSensitive =
    activeSettings.caseSensitive ||
    (!activeSettings.caseSensitive && activeSettings.smartCase && /[A-Z]/.test(pattern));

  const query = shouldUseCaseSensitive ? pattern : pattern.toLowerCase();
  const matches: FlashMatch[] = [];

  for (const range of view.visibleRanges) {
    const text = view.state.doc.sliceString(range.from, range.to);
    const haystack = shouldUseCaseSensitive ? text : text.toLowerCase();

    let index = haystack.indexOf(query);
    while (index !== -1) {
      const from = range.from + index;
      const to = from + pattern.length;
      matches.push({ from, to });
      index = haystack.indexOf(query, index + 1);
    }
  }

  return matches;
}

function assignLabels(view: EditorView, matches: FlashMatch[]): FlashMatch[] {
  const cursorPos = view.state.selection.main.head;

  const sorted = [...matches].sort((a, b) => {
    const da = Math.abs(a.from - cursorPos);
    const db = Math.abs(b.from - cursorPos);
    if (da !== db) {
      return da - db;
    }
    return a.from - b.from;
  });

  const continuationChars = new Set<string>();
  for (const match of sorted) {
    const nextChar = view.state.doc.sliceString(match.to, match.to + 1).toLowerCase();
    if (nextChar.length === 1) {
      continuationChars.add(nextChar);
    }
  }

  const labels = activeSettings.labelAlphabet.trim().length > 0
    ? activeSettings.labelAlphabet
    : "asdfghjklqwertyuiopzxcvbnm";

  const filteredLabels = labels
    .split("")
    .filter((label) => !continuationChars.has(label.toLowerCase()));
  const availableLabels = filteredLabels.length > 0 ? filteredLabels : labels.split("");

  for (let i = 0; i < sorted.length; i += 1) {
    const match = sorted[i];
    const label = availableLabels[i];
    if (match && label) {
      sorted[i] = {
        ...match,
        label
      };
    }
  }

  return sorted;
}

function computeNextState(view: EditorView, pattern: string): ReplaceStatePayload {
  const visibleMatches = findVisibleMatches(view, pattern);
  const matches = assignLabels(view, visibleMatches);

  if (activeSettings.autoJumpSingleMatch && matches.length === 1) {
    queueMicrotask(() => {
      const state = view.state.field(flashStateField);
      if (!state.active || state.pattern !== pattern) {
        return;
      }
      const single = state.matches[0];
      if (single) {
        jumpToMatch(view, single);
      }
    });
  }

  return {
    pattern,
    matches,
    targetIndex: matches.length > 0 ? 0 : -1
  };
}

function refreshState(view: EditorView, pattern: string): void {
  view.dispatch({
    effects: replaceFlashStateEffect.of(computeNextState(view, pattern))
  });
}

function jumpToMatch(view: EditorView, match: FlashMatch): void {
  view.dispatch({
    selection: { anchor: match.from },
    scrollIntoView: true,
    effects: stopFlashEffect.of(undefined)
  });
}

function handleFlashKeydown(event: KeyboardEvent, view: EditorView): boolean {
  const state = view.state.field(flashStateField);
  if (!state.active) {
    return false;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    view.dispatch({ effects: stopFlashEffect.of(undefined) });
    return true;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    if (state.pattern.length === 0) {
      view.dispatch({ effects: stopFlashEffect.of(undefined) });
      return true;
    }
    const nextPattern = state.pattern.slice(0, -1);
    refreshState(view, nextPattern);
    return true;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    const target = state.targetIndex >= 0 ? state.matches[state.targetIndex] : undefined;
    if (target) {
      jumpToMatch(view, target);
    } else {
      view.dispatch({ effects: stopFlashEffect.of(undefined) });
    }
    return true;
  }

  const key = event.key.toLowerCase();
  const byLabel = state.matches.find((match) => match.label === key);
  if (byLabel) {
    event.preventDefault();
    jumpToMatch(view, byLabel);
    return true;
  }

  if (isPrintableKey(event)) {
    event.preventDefault();
    refreshState(view, state.pattern + key);
    return true;
  }

  return false;
}

export function isFlashActive(view: EditorView): boolean {
  return view.state.field(flashStateField).active;
}

export function handleFlashKeydownForView(view: EditorView, event: KeyboardEvent): boolean {
  return handleFlashKeydown(event, view);
}

const flashViewPlugin = ViewPlugin.fromClass(
  class {
    private pendingRefresh = false;

    constructor(private readonly view: EditorView) {
      this.syncActiveClass();
    }

    private scheduleRefresh(): void {
      if (this.pendingRefresh) {
        return;
      }

      this.pendingRefresh = true;
      queueMicrotask(() => {
        this.pendingRefresh = false;
        const state = this.view.state.field(flashStateField);
        if (state.active) {
          refreshState(this.view, state.pattern);
        }
      });
    }

    private syncActiveClass(): void {
      const state = this.view.state.field(flashStateField);
      this.view.dom.classList.toggle("flash-nav-active", state.active);

      const wrapper = this.view.dom.closest(".workspace-leaf-content");
      if (wrapper) {
        wrapper.classList.toggle("flash-nav-leaf-active", state.active);
      }
    }

    update(update: ViewUpdate): void {
      const state = update.state.field(flashStateField);
      this.syncActiveClass();
      if (!state.active) {
        return;
      }

      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.scheduleRefresh();
      }
    }

    destroy(): void {
      this.view.dom.classList.remove("flash-nav-active");
      const wrapper = this.view.dom.closest(".workspace-leaf-content");
      if (wrapper) {
        wrapper.classList.remove("flash-nav-leaf-active");
      }
    }
  },
  {}
);

export const flashExtension = [flashStateField, flashViewPlugin];

export function startFlash(view: EditorView): void {
  view.focus();
  const state = view.state.field(flashStateField);
  if (!state.active) {
    view.dispatch({ effects: startFlashEffect.of(undefined) });
  }
  refreshState(view, "");
}

export function setFlashSettings(settings: FlashNavSettings): void {
  activeSettings = settings;
}
