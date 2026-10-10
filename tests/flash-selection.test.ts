import test from "node:test";
import assert from "node:assert/strict";
import { jumpVisual, readVisualContext, VisualHandoff, type Position, type VimAdapter } from "../src/flash-selection";

function adapter(): VimAdapter & { ranges: unknown; events: unknown[] } {
  const lines = ["alpha beta", "gamma delta", "epsilon"];
  return {
    state: { vim: { visualMode: true, visualLine: false, visualBlock: false,
      sel: { anchor: { line: 0, ch: 2 }, head: { line: 0, ch: 4 } } } },
    curOp: { isVimOp: true }, ranges: null, events: [],
    operation(callback) { this.curOp = { isVimOp: false }; callback(); this.curOp = null; },
    posFromIndex(index) { let line = 0; while (index > lines[line]!.length) index -= lines[line++]!.length + 1; return { line, ch: index }; },
    indexFromPos(pos) { return lines.slice(0, pos.line).reduce((sum, line) => sum + line.length + 1, 0) + pos.ch; },
    getLine(line) { return lines[line]!; },
    setSelections(ranges) { assert.equal(this.curOp?.isVimOp, true); this.ranges = ranges; },
    signal(event, value) { this.events.push([event, value]); }
  };
}

void test("direct visual invocation captures Vim anchor and submode", () => {
  const cm = adapter(); cm.state.vim!.visualLine = true;
  assert.deepEqual(new VisualHandoff().take(cm), { anchor: { line: 0, ch: 2 }, linewise: true, blockwise: false });
});

void test("Ex collapse preserves anchor only within the same operation, without a timeout", () => {
  const cm = adapter(); const handoff = new VisualHandoff();
  handoff.selectionChanged(cm, true);
  cm.state.vim!.visualMode = false;
  const originalNow = Date.now;
  try {
    Date.now = () => originalNow() + 10000;
    assert.equal(handoff.take(cm)?.anchor.ch, 2);
    assert.equal(handoff.take(cm), null);
  } finally { Date.now = originalNow; }
});

void test("normal mode after Escape or cancelled Ex cannot reuse old visual selection", () => {
  const cm = adapter(); const handoff = new VisualHandoff();
  handoff.selectionChanged(cm, true); cm.state.vim!.visualMode = false;
  cm.curOp = { isVimOp: true };
  assert.equal(handoff.take(cm), null);
  assert.equal(handoff.take(undefined), null);
});

void test("ordinary selections are never cached as a Vim handoff", () => {
  const cm = adapter(); const handoff = new VisualHandoff();
  cm.curOp = null; handoff.selectionChanged(cm, true); cm.state.vim!.visualMode = false;
  assert.equal(handoff.take(cm), null);
});

for (const target of [7, 0, 2]) {
  void test(`characterwise jump to ${target} includes both endpoints and restores Vim`, () => {
    const cm = adapter(); const context = readVisualContext(cm)!;
    cm.state.vim!.visualMode = false; jumpVisual(cm, context, target);
    assert.deepEqual(cm.ranges, [{ anchor: { line: 0, ch: target < 2 ? 3 : 2 }, head: { line: 0, ch: target < 2 ? target : target + 1 } }]);
    assert.equal(cm.state.vim!.visualMode, true);
    assert.deepEqual(cm.state.vim!.sel, { anchor: { line: 0, ch: 2 }, head: { line: 0, ch: target } });
  });
}

void test("linewise forward and reverse jumps retain whole lines", () => {
  const cm = adapter(); cm.state.vim!.visualLine = true;
  jumpVisual(cm, readVisualContext(cm)!, 15);
  assert.deepEqual(cm.ranges, [{ anchor: { line: 0, ch: 0 }, head: { line: 1, ch: 11 } }]);
  cm.state.vim!.sel.anchor = { line: 1, ch: 4 };
  jumpVisual(cm, readVisualContext(cm)!, 2);
  assert.deepEqual(cm.ranges, [{ anchor: { line: 1, ch: 11 }, head: { line: 0, ch: 0 } }]);
  assert.equal(cm.state.vim!.visualLine, true);
});

void test("blockwise jumps retain multiple ranges and Vim block mode", () => {
  const cm = adapter(); cm.state.vim!.visualBlock = true;
  jumpVisual(cm, readVisualContext(cm)!, 15);
  assert.deepEqual(cm.ranges, [{ anchor: { line: 0, ch: 2 }, head: { line: 0, ch: 5 } }, { anchor: { line: 1, ch: 2 }, head: { line: 1, ch: 5 } }]);
  assert.equal(cm.state.vim!.visualBlock, true);
});

void test("repeated visual jumps replace reserved bookmarks while preserving user marks", () => {
  const cm = adapter();
  const cleared: string[] = [];
  const positions: Position[] = [];
  const userMark = { clear: () => { cleared.push("user"); } };
  cm.state.vim!.marks = {
    "<": { clear: () => { cleared.push("old-start"); } },
    ">": { clear: () => { cleared.push("old-end"); } },
    a: userMark
  };
  cm.setBookmark = (pos) => {
    assert.equal(cm.curOp?.isVimOp, true);
    positions.push({ ...pos });
    return { clear: () => { cleared.push("replacement"); } };
  };
  jumpVisual(cm, readVisualContext(cm)!, 15);
  jumpVisual(cm, readVisualContext(cm)!, 0);
  assert.deepEqual(positions, [
    { line: 0, ch: 2 }, { line: 1, ch: 4 },
    { line: 0, ch: 0 }, { line: 0, ch: 2 }
  ]);
  assert.deepEqual(cleared, ["old-start", "old-end", "replacement", "replacement"]);
  assert.equal(cm.state.vim!.marks.a, userMark);
});

for (const missing of ["marks", "setBookmark"] as const) {
  void test(`visual selection still works when adapter has no ${missing} capability`, () => {
    const cm = adapter();
    if (missing === "marks") cm.setBookmark = () => { throw new Error("bookmarks are unavailable"); };
    else cm.state.vim!.marks = { "<": { clear: () => { throw new Error("bookmarks are unavailable"); } } };
    jumpVisual(cm, readVisualContext(cm)!, 15);
    assert.deepEqual(cm.ranges, [{ anchor: { line: 0, ch: 2 }, head: { line: 1, ch: 5 } }]);
    assert.equal(cm.state.vim!.visualMode, true);
  });
}
