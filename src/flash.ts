import { StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type ViewUpdate
} from "@codemirror/view";
import type { FlashNavSettings } from "./settings";
import { applyLabelPlacementCore, assignLabelsCore, findMatchesCore } from "./flash-core";

let activeSettings: FlashNavSettings = {
  labelAlphabet: "asdfghjklqwertyuiopzxcvbnm",
  labelReuseMode: "lowercase",
  labelCurrentMatch: true,
  searchDirection: "closest",
  searchScope: "viewport",
  caseSensitive: false,
  smartCase: true,
  autoJumpSingleMatch: false,
  backdropOpacity: 52
};

const reusedLabelsByPos = new Map<number, string>();

type FlashMatch = {
  from: number;
  to: number;
  label?: string;
  labelFrom?: number;
  labelTo?: number;
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

const flashStateField = StateField.define<FlashState>({
  create() {
    return INACTIVE_STATE;
  },
  update(value, tr) {
    let next = value;

    for (const effect of tr.effects) {
      if (effect.is(startFlashEffect)) {
        reusedLabelsByPos.clear();
        next = {
          active: true,
          pattern: "",
          matches: [],
          targetIndex: -1
        };
      } else if (effect.is(stopFlashEffect)) {
        reusedLabelsByPos.clear();
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

      const decorations: ReturnType<Decoration["range"]>[] = [];

      for (let i = 0; i < state.matches.length; i += 1) {
        const match = state.matches[i];
        if (!match) {
          continue;
        }
        const isCurrent = i === state.targetIndex;
        const markClass = isCurrent ? "flash-nav-match flash-nav-match-current" : "flash-nav-match";

        decorations.push(Decoration.mark({ class: markClass }).range(match.from, match.to));

        if (match.label) {
          const labelFrom = match.labelFrom ?? Math.max(match.from, match.to - 1);
          const labelTo = match.labelTo ?? match.to;
          if (labelTo > labelFrom) {
            const labelClass = isCurrent
              ? "flash-nav-label-slot flash-nav-label-slot-current"
              : "flash-nav-label-slot";
            decorations.push(
              Decoration.mark({
                class: labelClass,
                attributes: {
                  "data-flash-label": match.label
                }
              }).range(labelFrom, labelTo)
            );
          }
        }
      }

      return Decoration.set(decorations, true);
    })
});

function isPrintableKey(event: KeyboardEvent): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey;
}

function findMatches(view: EditorView, pattern: string): FlashMatch[] {
  return findMatchesCore({
    doc: view.state.doc.toString(),
    pattern,
    cursorPos: view.state.selection.main.head,
    visibleRanges: view.visibleRanges,
    searchScope: activeSettings.searchScope,
    searchDirection: activeSettings.searchDirection,
    caseSensitive: activeSettings.caseSensitive,
    smartCase: activeSettings.smartCase
  });
}

function assignLabelsForView(view: EditorView, matches: FlashMatch[]): FlashMatch[] {
  return assignLabelsCore({
    doc: view.state.doc.toString(),
    matches,
    cursorPos: view.state.selection.main.head,
    labelAlphabet: activeSettings.labelAlphabet,
    labelReuseMode: activeSettings.labelReuseMode,
    labelCurrentMatch: activeSettings.labelCurrentMatch,
    searchDirection: activeSettings.searchDirection,
    reusedLabelsByPos
  });
}

function computeNextState(view: EditorView, pattern: string): ReplaceStatePayload {
  const matchesInScope = findMatches(view, pattern);
  const matches = applyLabelPlacementCore(view.state.doc.toString(), assignLabelsForView(view, matchesInScope));

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
  const shouldResetReuse =
    activeSettings.labelAlphabet !== settings.labelAlphabet
    || activeSettings.labelReuseMode !== settings.labelReuseMode
    || activeSettings.labelCurrentMatch !== settings.labelCurrentMatch
    || activeSettings.searchDirection !== settings.searchDirection
    || activeSettings.searchScope !== settings.searchScope;

  activeSettings = settings;

  if (shouldResetReuse) {
    reusedLabelsByPos.clear();
  }
}
