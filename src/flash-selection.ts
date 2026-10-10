export type Position = { line: number; ch: number };
export type VisualContext = { anchor: Position; linewise: boolean; blockwise: boolean };
type VimBookmark = { clear: () => void };
export type VimAdapter = {
  state: { vim?: { visualMode: boolean; visualLine: boolean; visualBlock: boolean;
    sel: { anchor: Position; head: Position }; marks?: Record<string, VimBookmark | undefined> } };
  curOp?: { isVimOp?: boolean } | null;
  operation: (callback: () => void) => void;
  posFromIndex: (index: number) => Position;
  indexFromPos: (pos: Position) => number;
  getLine: (line: number) => string;
  setSelections: (ranges: { anchor: Position; head: Position }[], primary?: number) => void;
  setBookmark?: (pos: Position) => VimBookmark;
  signal: (event: string, value: unknown) => void;
};

export function readVisualContext(cm: VimAdapter | undefined): VisualContext | null {
  const vim = cm?.state.vim;
  return vim?.visualMode ? {
    anchor: { ...vim.sel.anchor }, linewise: vim.visualLine, blockwise: vim.visualBlock
  } : null;
}

export function jumpVisual(cm: VimAdapter, context: VisualContext, target: number): void {
  const vim = cm.state.vim;
  if (!vim) return;
  const anchor = { ...context.anchor };
  const head = cm.posFromIndex(target);
  const forward = cm.indexFromPos(head) >= cm.indexFromPos(anchor);
  let ranges: { anchor: Position; head: Position }[];
  let primary = 0;
  if (context.blockwise) {
    const top = Math.min(anchor.line, head.line);
    const bottom = Math.max(anchor.line, head.line);
    ranges = [];
    for (let line = top; line <= bottom; line++) {
      ranges.push({ anchor: { line, ch: anchor.ch + (head.ch <= anchor.ch ? 1 : 0) },
        head: { line, ch: head.ch + (head.ch > anchor.ch ? 1 : 0) } });
    }
    primary = head.line === top ? 0 : ranges.length - 1;
  } else if (context.linewise) {
    ranges = [{ anchor: { line: anchor.line, ch: forward ? 0 : cm.getLine(anchor.line).length },
      head: { line: head.line, ch: forward ? cm.getLine(head.line).length : 0 } }];
  } else {
    ranges = [{ anchor: { ...anchor, ch: anchor.ch + (forward ? 0 : 1) },
      head: { ...head, ch: head.ch + (forward ? 1 : 0) } }];
  }
  cm.operation(() => {
    // Prevent Vim's external-selection handler from converting line/block selections.
    if (cm.curOp) cm.curOp.isVimOp = true;
    vim.visualMode = true;
    vim.visualLine = context.linewise;
    vim.visualBlock = context.blockwise;
    vim.sel = { anchor, head };
    cm.setSelections(ranges, primary);
    // Native visual Ex commands resolve their range through these bookmarks.
    // Replace only Vim's reserved visual marks, as a native visual motion does.
    if (vim.marks && typeof cm.setBookmark === "function") {
      vim.marks["<"]?.clear();
      vim.marks["<"] = cm.setBookmark(forward ? anchor : head);
      vim.marks[">"]?.clear();
      vim.marks[">"] = cm.setBookmark(forward ? head : anchor);
    }
    cm.signal("vim-mode-change", { mode: "visual",
      subMode: context.linewise ? "linewise" : context.blockwise ? "blockwise" : "" });
  });
}

export class VisualHandoff {
  private pending: { operation: object; context: VisualContext } | null = null;

  selectionChanged(cm: VimAdapter | undefined, empty: boolean): void {
    // Vim's Ex dispatcher collapses the CM selection synchronously, before
    // clearing visualMode. Snapshot that state during the selection update.
    const context = readVisualContext(cm);
    this.pending = empty && context && cm?.curOp?.isVimOp
      ? { operation: cm.curOp, context } : null;
  }

  take(cm: VimAdapter | undefined): VisualContext | null {
    // curOp is replaced/cleared at the end of the command. Its identity allows
    // only that command to consume the snapshot, without a timing heuristic.
    const context = readVisualContext(cm)
      ?? (this.pending?.operation === cm?.curOp ? this.pending?.context ?? null : null);
    this.pending = null;
    return context;
  }
}
