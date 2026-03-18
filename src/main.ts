import { Plugin, Editor, MarkdownView, Notice } from "obsidian";
import { EditorView } from "@codemirror/view";
import { flashExtension, handleFlashKeydownForView, isFlashActive, startFlash } from "./flash";

export default class ObsidianFlashNavPlugin extends Plugin {
  private globalKeydownHandler?: (event: KeyboardEvent) => void;

  private resolveActiveEditorView(): EditorView | null {
    const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!markdownView) {
      return null;
    }

    const editor = markdownView.editor as Editor & { cm?: EditorView };
    return editor.cm ?? null;
  }

  async onload() {
    this.registerEditorExtension(flashExtension);

    this.globalKeydownHandler = (event: KeyboardEvent) => {
      const cm = this.resolveActiveEditorView();
      if (!cm || !isFlashActive(cm)) {
        return;
      }

      if (!cm.hasFocus) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node) || !cm.dom.contains(target)) {
        return;
      }

      const consumed = handleFlashKeydownForView(cm, event);
      if (consumed) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") {
          event.stopImmediatePropagation();
        }
      }
    };

    this.registerDomEvent(document, "keydown", this.globalKeydownHandler, {
      capture: true
    });

    this.addCommand({
      id: "flash-nav-start",
      name: "Flash Nav: Start jump",
      editorCallback: (editor: Editor, _view: MarkdownView) => {
        const cm = (editor as Editor & { cm?: EditorView }).cm ?? this.resolveActiveEditorView();
        if (!cm) {
          new Notice("Flash Nav is only available in the markdown editor.");
          return;
        }
        startFlash(cm);
      }
    });
  }
}
