import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType
} from "@codemirror/view";

const DEFAULT_LABELS = "asdfghjklqwertyuiopzxcvbnm";

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

      for (let i = 0; i < state.matches.length; i += 1) {
        const match = state.matches[i];
        if (!match) {
          continue;
        }
        const isCurrent = i === state.targetIndex;
        const markClass = isCurrent ? "flash-nav-match flash-nav-match-current" : "flash-nav-match";

        builder.add(match.from, match.to, Decoration.mark({ class: markClass }));

        if (match.label) {
          builder.add(
            match.to,
            match.to,
            Decoration.widget({
              widget: new LabelWidget(match.label, isCurrent),
              side: 1
            })
          );
        }
      }

      return builder.finish();
    })
});

function isPrintableKey(event: KeyboardEvent): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
}

function findVisibleMatches(view: EditorView, pattern: string): FlashMatch[] {
  if (pattern.length === 0) {
    return [];
  }

  const query = pattern.toLowerCase();
  const matches: FlashMatch[] = [];

  for (const range of view.visibleRanges) {
    const text = view.state.doc.sliceString(range.from, range.to);
    const haystack = text.toLowerCase();

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

  const availableLabels = DEFAULT_LABELS
    .split("")
    .filter((label) => !continuationChars.has(label.toLowerCase()));

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

const flashViewPlugin = ViewPlugin.fromClass(
  class {
    constructor(private readonly view: EditorView) {}

    update(update: ViewUpdate): void {
      const state = update.state.field(flashStateField);
      if (!state.active) {
        return;
      }

      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        refreshState(this.view, state.pattern);
      }
    }
  },
  {
    eventHandlers: {
      keydown(event, view) {
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

        const byLabel = state.matches.find((match) => match.label === event.key);
        if (byLabel) {
          event.preventDefault();
          jumpToMatch(view, byLabel);
          return true;
        }

        if (isPrintableKey(event)) {
          event.preventDefault();
          refreshState(view, state.pattern + event.key);
          return true;
        }

        return false;
      }
    }
  }
);

export const flashExtension = [flashStateField, flashViewPlugin];

export function startFlash(view: EditorView): void {
  const state = view.state.field(flashStateField);
  if (!state.active) {
    view.dispatch({ effects: startFlashEffect.of(undefined) });
  }
  refreshState(view, "");
}
