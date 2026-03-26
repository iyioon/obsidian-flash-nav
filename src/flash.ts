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
  labelBackgroundColor: "#3b82f6",
  currentLabelBackgroundColor: "#ef4444",
  searchDirection: "closest",
  searchScope: "viewport",
  caseSensitive: false,
  smartCase: true,
  autoJumpSingleMatch: false,
  backdropOpacity: 52
};

const reusedLabelsByPos = new Map<number, string>();
const recentVisualSelectionByView = new WeakMap<EditorView, {
  anchor: number;
  head: number;
  ts: number;
}>();
const VISUAL_SELECTION_REUSE_MS = 1500;
const PROFILE_LOG_THRESHOLD_MS = 8;

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
  visualAnchor: number | null;
};

const INACTIVE_STATE: FlashState = {
  active: false,
  pattern: "",
  matches: [],
  targetIndex: -1,
  visualAnchor: null
};

type ReplaceStatePayload = {
  pattern: string;
  matches: FlashMatch[];
  targetIndex: number;
};

type ProfileEvent = {
  durationMs: number;
  patternLen: number;
  matchCount: number;
  changed: boolean;
  scope: FlashNavSettings["searchScope"];
  direction: FlashNavSettings["searchDirection"];
};

const startFlashEffect = StateEffect.define<{ visualAnchor: number | null }>();
const stopFlashEffect = StateEffect.define<void>();
const replaceFlashStateEffect = StateEffect.define<ReplaceStatePayload>();

function isProfilingEnabled(): boolean {
  const flag = (globalThis as { __FLASH_NAV_PROFILE__?: unknown }).__FLASH_NAV_PROFILE__;
  return flag === true || flag === "1" || flag === 1;
}

function logProfile(event: ProfileEvent): void {
  if (!isProfilingEnabled()) {
    return;
  }
  if (event.durationMs < PROFILE_LOG_THRESHOLD_MS) {
    return;
  }

  const rounded = Math.round(event.durationMs * 100) / 100;
  console.debug(
    `[flash-nav][profile] compute=${rounded}ms patternLen=${event.patternLen} matches=${event.matchCount} changed=${event.changed} scope=${event.scope} direction=${event.direction}`
  );
}

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
          targetIndex: -1,
          visualAnchor: effect.value.visualAnchor
        };
      } else if (effect.is(stopFlashEffect)) {
        reusedLabelsByPos.clear();
        next = INACTIVE_STATE;
      } else if (effect.is(replaceFlashStateEffect)) {
        next = {
          active: true,
          pattern: effect.value.pattern,
          matches: effect.value.matches,
          targetIndex: effect.value.targetIndex,
          visualAnchor: value.visualAnchor
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

function findMatches(
  view: EditorView,
  docText: string,
  cursorPos: number,
  pattern: string
): FlashMatch[] {
  return findMatchesCore({
    doc: docText,
    pattern,
    cursorPos,
    visibleRanges: view.visibleRanges,
    searchScope: activeSettings.searchScope,
    searchDirection: activeSettings.searchDirection,
    caseSensitive: activeSettings.caseSensitive,
    smartCase: activeSettings.smartCase
  });
}

function assignLabelsForView(
  docText: string,
  cursorPos: number,
  matches: FlashMatch[]
): FlashMatch[] {
  return assignLabelsCore({
    doc: docText,
    matches,
    cursorPos,
    labelAlphabet: activeSettings.labelAlphabet,
    labelReuseMode: activeSettings.labelReuseMode,
    labelCurrentMatch: activeSettings.labelCurrentMatch,
    searchDirection: activeSettings.searchDirection,
    reusedLabelsByPos
  });
}

function computeNextState(view: EditorView, pattern: string): ReplaceStatePayload {
  const docText = view.state.doc.toString();
  const cursorPos = view.state.selection.main.head;

  const matchesInScope = findMatches(view, docText, cursorPos, pattern);
  const labeled = assignLabelsForView(docText, cursorPos, matchesInScope);
  const matches = applyLabelPlacementCore(docText, labeled);

  if (activeSettings.autoJumpSingleMatch && matches.length === 1) {
    queueMicrotask(() => {
      const state = view.state.field(flashStateField);
      if (!state.active || state.pattern !== pattern) {
        return;
      }
      const single = state.matches[0];
      if (single) {
        jumpToMatch(view, single, state.visualAnchor);
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
  const startTime = performance.now();
  const current = view.state.field(flashStateField);
  const next = computeNextState(view, pattern);

  const isSameState =
    current.pattern === next.pattern
    && current.targetIndex === next.targetIndex
    && current.matches.length === next.matches.length
    && current.matches.every((match, idx) => {
      const other = next.matches[idx];
      return other
        && match.from === other.from
        && match.to === other.to
        && match.label === other.label
        && match.labelFrom === other.labelFrom
        && match.labelTo === other.labelTo;
    });

  const durationMs = performance.now() - startTime;

  logProfile({
    durationMs,
    patternLen: pattern.length,
    matchCount: next.matches.length,
    changed: !isSameState,
    scope: activeSettings.searchScope,
    direction: activeSettings.searchDirection
  });

  if (isSameState) {
    return;
  }

  view.dispatch({
    effects: replaceFlashStateEffect.of(next)
  });
}

function jumpToMatch(view: EditorView, match: FlashMatch, visualAnchor: number | null): void {
  const selection = (() => {
    if (visualAnchor === null) {
      return { anchor: match.from };
    }

    const movingForward = match.from >= visualAnchor;
    const inclusiveHead = movingForward
      ? Math.min(match.from + 1, view.state.doc.length)
      : match.from;

    return { anchor: visualAnchor, head: inclusiveHead };
  })();

  view.dispatch({
    selection,
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
      jumpToMatch(view, target, state.visualAnchor);
    } else {
      view.dispatch({ effects: stopFlashEffect.of(undefined) });
    }
    return true;
  }

  const key = event.key.toLowerCase();
  const byLabel = state.matches.find((match) => match.label === key);
  if (byLabel) {
    event.preventDefault();
    jumpToMatch(view, byLabel, state.visualAnchor);
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

function toFlashView(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return null;
  }

  const maybe = value as {
    dispatch?: unknown;
    state?: unknown;
    dom?: unknown;
    focus?: unknown;
  };

  if (typeof maybe.dispatch !== "function") {
    return null;
  }
  if (!maybe.state || !maybe.dom) {
    return null;
  }
  if (typeof maybe.focus !== "function") {
    return null;
  }

  return value;
}

export function isFlashActiveOn(value: unknown): boolean {
  const view = toFlashView(value);
  return view ? isFlashActive(view as Parameters<typeof isFlashActive>[0]) : false;
}

export function handleFlashKeydownOn(value: unknown, event: KeyboardEvent): boolean {
  const view = toFlashView(value);
  return view ? handleFlashKeydownForView(view as Parameters<typeof handleFlashKeydownForView>[0], event) : false;
}

export function startFlashOn(value: unknown): boolean {
  const view = toFlashView(value);
  if (!view) {
    return false;
  }
  startFlash(view as Parameters<typeof startFlash>[0]);
  return true;
}

const flashViewPlugin = ViewPlugin.fromClass(
  class {
    private pendingRefresh = false;
    private lastRefreshSignature = "";

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
          const signature = `${state.pattern}|${this.view.state.selection.main.head}|${this.view.visibleRanges.map((r) => `${r.from}:${r.to}`).join(",")}`;
          if (signature === this.lastRefreshSignature) {
            return;
          }
          this.lastRefreshSignature = signature;
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

      if (update.selectionSet) {
        const main = update.state.selection.main;
        if (!main.empty) {
          recentVisualSelectionByView.set(this.view, {
            anchor: main.anchor,
            head: main.head,
            ts: Date.now()
          });
        }
      }

      if (!state.active) {
        this.lastRefreshSignature = "";
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

  const range = view.state.selection.main;
  let visualAnchor = range.empty ? null : range.anchor;

  if (visualAnchor === null) {
    const recent = recentVisualSelectionByView.get(view);
    if (recent) {
      const now = Date.now();
      const isFresh = now - recent.ts <= VISUAL_SELECTION_REUSE_MS;
      const cursor = range.head;
      const isRelated = cursor === recent.anchor || cursor === recent.head;
      if (isFresh && isRelated) {
        visualAnchor = recent.anchor;
      }
    }
  }

  const state = view.state.field(flashStateField);
  if (!state.active) {
    view.dispatch({ effects: startFlashEffect.of({ visualAnchor }) });
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
