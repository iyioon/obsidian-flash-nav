import type { FlashNavSettings } from "./settings";

export type CoreMatch = {
  from: number;
  to: number;
  label?: string;
  labelFrom?: number;
  labelTo?: number;
};

type ReuseMode = FlashNavSettings["labelReuseMode"];
type Direction = FlashNavSettings["searchDirection"];
type Scope = FlashNavSettings["searchScope"];

function getLineRange(doc: string, pos: number): { from: number; to: number } {
  const clamped = Math.max(0, Math.min(pos, doc.length));
  let from = clamped;
  while (from > 0 && doc[from - 1] !== "\n") {
    from -= 1;
  }

  let to = clamped;
  while (to < doc.length && doc[to] !== "\n") {
    to += 1;
  }

  return { from, to };
}

export function findMatchesCore(opts: {
  doc: string;
  pattern: string;
  cursorPos: number;
  visibleRanges: ReadonlyArray<{ from: number; to: number }>;
  searchScope: Scope;
  searchDirection: Direction;
  caseSensitive: boolean;
  smartCase: boolean;
}): CoreMatch[] {
  const {
    doc,
    pattern,
    cursorPos,
    visibleRanges,
    searchScope,
    searchDirection,
    caseSensitive,
    smartCase
  } = opts;

  if (pattern.length === 0) {
    return [];
  }

  const shouldUseCaseSensitive = caseSensitive || (!caseSensitive && smartCase && /[A-Z]/.test(pattern));
  const query = shouldUseCaseSensitive ? pattern : pattern.toLowerCase();

  const ranges = (() => {
    if (searchScope === "document") {
      return [{ from: 0, to: doc.length }];
    }
    if (searchScope === "line") {
      return [getLineRange(doc, cursorPos)];
    }
    return visibleRanges;
  })();

  const matches: CoreMatch[] = [];

  for (const range of ranges) {
    const text = doc.slice(range.from, range.to);
    const haystack = shouldUseCaseSensitive ? text : text.toLowerCase();
    let index = haystack.indexOf(query);

    while (index !== -1) {
      const from = range.from + index;
      const to = from + pattern.length;

      if (searchDirection === "forward" && from < cursorPos) {
        index = haystack.indexOf(query, index + 1);
        continue;
      }

      if (searchDirection === "backward" && from > cursorPos) {
        index = haystack.indexOf(query, index + 1);
        continue;
      }

      matches.push({ from, to });
      index = haystack.indexOf(query, index + 1);
    }
  }

  return matches;
}

export function assignLabelsCore(opts: {
  doc: string;
  matches: CoreMatch[];
  cursorPos: number;
  labelAlphabet: string;
  labelReuseMode: ReuseMode;
  labelCurrentMatch: boolean;
  searchDirection: Direction;
  reusedLabelsByPos: Map<number, string>;
}): CoreMatch[] {
  const {
    doc,
    matches,
    cursorPos,
    labelAlphabet,
    labelReuseMode,
    labelCurrentMatch,
    searchDirection,
    reusedLabelsByPos
  } = opts;

  const sorted = [...matches].sort((a, b) => {
    if (searchDirection === "forward") {
      return a.from - b.from;
    }

    if (searchDirection === "backward") {
      return b.from - a.from;
    }

    const da = Math.abs(a.from - cursorPos);
    const db = Math.abs(b.from - cursorPos);
    if (da !== db) {
      return da - db;
    }
    return a.from - b.from;
  });

  const continuationChars = new Set<string>();
  for (const match of sorted) {
    const nextChar = doc.slice(match.to, match.to + 1).toLowerCase();
    if (nextChar.length === 1) {
      continuationChars.add(nextChar);
    }
  }

  const labels = labelAlphabet.trim().length > 0 ? labelAlphabet : "asdfghjklqwertyuiopzxcvbnm";
  const filteredLabels = labels.split("").filter((label) => !continuationChars.has(label.toLowerCase()));
  const availableLabels = filteredLabels.length > 0 ? filteredLabels : labels.split("");

  const canReuseLabel = (label: string): boolean => {
    if (labelReuseMode === "none") {
      return false;
    }
    if (labelReuseMode === "all") {
      return true;
    }
    return label.toLowerCase() === label;
  };

  for (let i = 0; i < sorted.length; i += 1) {
    const match = sorted[i];
    if (!match) {
      continue;
    }
    const isCurrent = i === 0;

    if (!labelCurrentMatch && isCurrent) {
      continue;
    }
    if (labelReuseMode === "none") {
      continue;
    }

    const reused = reusedLabelsByPos.get(match.from);
    if (!reused) {
      continue;
    }

    const reusedIndex = availableLabels.indexOf(reused);
    if (reusedIndex === -1) {
      continue;
    }

    sorted[i] = {
      ...match,
      label: reused
    };
    availableLabels.splice(reusedIndex, 1);
  }

  for (let i = 0; i < sorted.length; i += 1) {
    const match = sorted[i];
    if (!match) {
      continue;
    }
    const isCurrent = i === 0;

    if (!labelCurrentMatch && isCurrent) {
      continue;
    }
    if (match.label) {
      continue;
    }

    const label = availableLabels.shift();
    if (!label) {
      continue;
    }

    sorted[i] = {
      ...match,
      label
    };

    if (canReuseLabel(label)) {
      reusedLabelsByPos.set(match.from, label);
    }
  }

  return sorted;
}

export function applyLabelPlacementCore(doc: string, matches: CoreMatch[]): CoreMatch[] {
  return matches.map((match) => {
    if (!match.label) {
      return match;
    }

    const line = getLineRange(doc, match.to);
    const canUseNextChar = match.to < line.to;
    const labelFrom = canUseNextChar ? match.to : Math.max(match.from, match.to - 1);
    const labelTo = canUseNextChar ? Math.min(match.to + 1, line.to) : match.to;

    return {
      ...match,
      labelFrom,
      labelTo
    };
  });
}
