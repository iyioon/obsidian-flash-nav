import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { vim, Vim, getCM } from "@replit/codemirror-vim";
import { flashExtension, handleFlashKeydownForView, isFlashActive, setFlashSettings, startFlash } from "../src/flash";

const dom = new JSDOM("<!doctype html><body></body>", { pretendToBeVisual: true });
for (const name of ["window", "document", "MutationObserver", "HTMLElement", "Node", "KeyboardEvent", "Window"] as const) {
  Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true });
}
Object.defineProperty(globalThis, "getComputedStyle", { value: dom.window.getComputedStyle.bind(dom.window), configurable: true });
Object.defineProperty(globalThis, "requestAnimationFrame", { value: dom.window.requestAnimationFrame.bind(dom.window), configurable: true });
Object.defineProperty(globalThis, "cancelAnimationFrame", { value: dom.window.cancelAnimationFrame.bind(dom.window), configurable: true });
test.after(() => dom.window.close());

const doc = "alpha beta\ngamma delta\nepsilon";

function editor(vimFirst: boolean, anchor = 2, autoJumpSingleMatch = false) {
  setFlashSettings({ searchScope: "document", labelAlphabet: "qzx", autoJumpSingleMatch,
    labelReuseMode: "none", labelCurrentMatch: true, labelBackgroundColor: "#3b82f6",
    currentLabelBackgroundColor: "#ef4444", searchDirection: "closest", caseSensitive: false,
    smartCase: true, backdropOpacity: 52 });
  return new EditorView({
    state: EditorState.create({ doc, selection: { anchor }, extensions: [
      EditorState.allowMultipleSelections.of(true),
      ...(vimFirst ? [vim(), flashExtension] : [flashExtension, vim()])
    ] }),
    parent: document.body
  });
}

function key(view: EditorView, value: string): void {
  assert.equal(handleFlashKeydownForView(view, new KeyboardEvent("keydown", { key: value })), true);
}

for (const vimFirst of [true, false]) {
  for (const [mode, entry] of [["characterwise", "v"], ["linewise", "V"], ["blockwise", "<C-v>"]] as const) {
    for (const [anchor, target, pattern] of [[2, 0, "alpha"], [2, 2, "pha"], [2, 15, "a delta"],
      [15, 2, "pha"], [15, 15, "a delta"], [2, 29, "n"]] as const) {
      void test(`real Vim Ex mapping: ${mode}, ${anchor} to ${target}, Vim extension first=${vimFirst}`, () => {
        const view = editor(vimFirst, anchor);
        try {
          const cm = getCM(view)!;
          Vim.handleKey(cm, entry, "user");
          // Compare against Vim's own selection conversion at the same target.
          const expectedView = editor(vimFirst, anchor);
          let expected: EditorSelection;
          try {
            const expectedCM = getCM(expectedView)!;
            Vim.handleKey(expectedCM, entry, "user");
            const pos = expectedCM.posFromIndex(target);
            // Use native G/h/l motions to reach the target from (0, 2).
            if (pos.line !== expectedCM.state.vim!.sel.head.line) {
              Vim.handleKey(expectedCM, String(pos.line + 1), "user");
              Vim.handleKey(expectedCM, "G", "user");
            }
            const delta = pos.ch - expectedCM.state.vim!.sel.head.ch;
            for (let ch = 0; ch < Math.abs(delta); ch++) Vim.handleKey(expectedCM, delta < 0 ? "h" : "l", "user");
            expected = expectedView.state.selection;
          } finally { expectedView.destroy(); }
          Vim.defineEx("flashintegration", "flashintegration", () => startFlash(view));
          Vim.map("s", ":flashintegration<CR>", "visual");
          Vim.handleKey(cm, "s", "user");
          assert.equal(isFlashActive(view), true);
          // Search a unique word so Enter selects the requested match.
          for (const char of pattern) key(view, char);
          key(view, "Enter");
          assert.equal(isFlashActive(view), false);
          assert.equal(cm.state.vim!.visualMode, true);
          assert.equal(cm.state.vim!.visualLine, mode === "linewise");
          assert.equal(cm.state.vim!.visualBlock, mode === "blockwise");
          assert.deepEqual(view.state.selection.toJSON(), expected.toJSON());
          assert.deepEqual({ ...cm.state.vim!.sel.anchor }, cm.posFromIndex(anchor));
          assert.deepEqual({ ...cm.state.vim!.sel.head }, cm.posFromIndex(target));
          // A subsequent native motion must retain the visual submode.
          Vim.handleKey(cm, "l", "user");
          assert.equal(cm.state.vim!.visualMode, true);
          assert.equal(cm.state.vim!.visualLine, mode === "linewise");
          assert.equal(cm.state.vim!.visualBlock, mode === "blockwise");
        } finally { Vim.unmap("s", "visual"); view.destroy(); }
      });
    }
  }
}

for (const vimFirst of [true, false]) {
  void test(`repeated visual Ex jumps retain the original anchor, order=${vimFirst}`, () => {
    const view = editor(vimFirst);
    try {
      const cm = getCM(view)!;
      Vim.handleKey(cm, "v", "user");
      Vim.defineEx("flashintegration", "flashintegration", () => startFlash(view));
      for (const pattern of ["delta", "alpha"]) {
        Vim.handleEx(cm as Parameters<typeof Vim.handleEx>[0], "flashintegration");
        for (const char of pattern) key(view, char);
        key(view, "Enter");
        assert.deepEqual({ ...cm.state.vim!.sel.anchor }, { line: 0, ch: 2 });
        assert.equal(cm.state.vim!.visualMode, true);
      }
      assert.equal(view.state.selection.main.anchor, 3);
      assert.equal(view.state.selection.main.head, 0);
    } finally { view.destroy(); }
  });

  void test(`normal Vim invocation after Escape never restores old selection, order=${vimFirst}`, () => {
    const view = editor(vimFirst);
    try {
      const cm = getCM(view)!;
      Vim.handleKey(cm, "v", "user");
      Vim.handleKey(cm, "l", "user");
      Vim.handleKey(cm, "<Esc>", "user");
      startFlash(view);
      for (const char of "delta") key(view, char);
      key(view, "Enter");
      assert.equal(view.state.selection.main.empty, true);
      assert.equal(view.state.selection.main.head, 17);
      assert.equal(cm.state.vim!.visualMode, false);
    } finally { view.destroy(); }
  });

  void test(`unrelated Ex command cannot leave a stale handoff, order=${vimFirst}`, () => {
    const view = editor(vimFirst);
    try {
      const cm = getCM(view)!;
      Vim.handleKey(cm, "V", "user");
      Vim.defineEx("unrelatedintegration", "unrelatedintegration", () => {});
      Vim.handleEx(cm as Parameters<typeof Vim.handleEx>[0], "unrelatedintegration");
      assert.equal(cm.state.vim!.visualMode, false);
      startFlash(view);
      for (const char of "delta") key(view, char);
      key(view, "Enter");
      assert.equal(view.state.selection.main.empty, true);
      assert.equal(cm.state.vim!.visualMode, false);
    } finally { view.destroy(); }
  });

  for (const finish of ["label", "auto"] as const) {
    void test(`direct visual invocation completes by ${finish}, order=${vimFirst}`, async () => {
      const view = editor(vimFirst, 2, finish === "auto");
      try {
        const cm = getCM(view)!;
        Vim.handleKey(cm, "v", "user");
        startFlash(view);
        for (const char of "delta") key(view, char);
        if (finish === "label") key(view, "q");
        else await Promise.resolve();
        assert.equal(isFlashActive(view), false);
        assert.equal(cm.state.vim!.visualMode, true);
        assert.equal(view.state.selection.main.anchor, 2);
        assert.equal(view.state.selection.main.head, 18);
        Vim.handleKey(cm, "y", "user");
        assert.equal(Vim.getRegisterController().getRegister('"').toString(), doc.slice(2, 18));
      } finally { view.destroy(); }
    });
  }

  for (const cancel of ["Escape", "Backspace", "Enter"] as const) {
    void test(`Ex flash cancellation by ${cancel} leaves document intact, order=${vimFirst}`, () => {
      const view = editor(vimFirst);
      try {
        const cm = getCM(view)!;
        Vim.handleKey(cm, "v", "user");
        Vim.defineEx("flashintegration", "flashintegration", () => startFlash(view));
        Vim.handleEx(cm as Parameters<typeof Vim.handleEx>[0], "flashintegration");
        if (cancel === "Enter") for (const char of "zzzz") key(view, char);
        key(view, cancel);
        assert.equal(isFlashActive(view), false);
        assert.equal(view.state.doc.toString(), doc);
        assert.equal(cm.state.vim!.visualMode, false);
        startFlash(view);
        for (const char of "delta") key(view, char);
        key(view, "Enter");
        assert.equal(view.state.selection.main.empty, true);
      } finally { view.destroy(); }
    });
  }
}

for (const vimFirst of [true, false]) {
  for (const [mode, entry] of [["characterwise", "v"], ["linewise", "V"], ["blockwise", "<C-v>"]] as const) {
    for (const route of ["direct", "Ex"] as const) {
      for (const [anchor, target, pattern] of [[2, 23, "epsilon"], [25, 2, "pha"]] as const) {
        void test(`visual bookmarks and immediate Ex range follow ${route} Flash: ${mode}, ${anchor} to ${target}, order=${vimFirst}`, () => {
          const view = editor(vimFirst, anchor);
          try {
            const cm = getCM(view)!;
            Vim.handleKey(cm, entry, "user");
            // Start from an already reversed selection, then cross its anchor.
            Vim.handleKey(cm, "h", "user");
            if (route === "direct") startFlash(view);
            else {
              Vim.defineEx("flashintegration", "flashintegration", () => startFlash(view));
              Vim.handleEx(cm as Parameters<typeof Vim.handleEx>[0], "flashintegration");
            }
            for (const char of pattern) key(view, char);
            key(view, "Enter");
            assert.equal(cm.state.vim!.visualMode, true);
            assert.equal(cm.state.vim!.visualLine, mode === "linewise");
            assert.equal(cm.state.vim!.visualBlock, mode === "blockwise");
            const first = cm.posFromIndex(Math.min(anchor, target));
            const last = cm.posFromIndex(Math.max(anchor, target));
            assert.deepEqual(cm.state.vim!.marks["<"]!.find(), first);
            assert.deepEqual(cm.state.vim!.marks[">"]!.find(), last);
            let exRange: { line: number | undefined; lineEnd: number | undefined } | undefined;
            Vim.defineEx("inspectflashrange", "inspectflashrange", (_cm, params) => {
              exRange = { line: params.line, lineEnd: params.lineEnd };
            });
            // Invoke the native visual range before any motion can refresh marks.
            Vim.handleEx(cm as Parameters<typeof Vim.handleEx>[0], "'<,'>inspectflashrange");
            assert.deepEqual(exRange, { line: first.line, lineEnd: last.line });
            assert.equal(view.state.doc.toString(), doc);
          } finally { view.destroy(); }
        });
      }
    }
  }
}

void test("non-Vim editor extends an ordinary selection", () => {
  const view = new EditorView({ state: EditorState.create({ doc, selection: { anchor: 2, head: 4 },
    extensions: flashExtension }), parent: document.body });
  try {
    startFlash(view);
    for (const char of "delta") key(view, char);
    key(view, "Enter");
    assert.equal(view.state.selection.main.anchor, 2);
    assert.equal(view.state.selection.main.head, 18);
  } finally { view.destroy(); }
});
