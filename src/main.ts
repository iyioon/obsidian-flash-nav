import { Plugin, Editor, MarkdownView, Notice } from "obsidian";
import { EditorView } from "@codemirror/view";
import { flashExtension, startFlash } from "./flash";

export default class ObsidianFlashNavPlugin extends Plugin {
  async onload() {
    this.registerEditorExtension(flashExtension);

    this.addCommand({
      id: "flash-nav-start",
      name: "Flash Nav: Start jump",
      editorCallback: (editor: Editor, _view: MarkdownView) => {
        const cm = (editor as Editor & { cm?: EditorView }).cm;
        if (!cm) {
          new Notice("Flash Nav is only available in the markdown editor.");
          return;
        }
        startFlash(cm);
      }
    });

    this.addCommand({
      id: "flash-nav-start-vim-s",
      name: "Flash Nav: Start jump (bind this to s in Vim normal mode)",
      editorCallback: (editor: Editor, _view: MarkdownView) => {
        const cm = (editor as Editor & { cm?: EditorView }).cm;
        if (!cm) {
          new Notice("Flash Nav is only available in the markdown editor.");
          return;
        }
        startFlash(cm);
      }
    });
  }
}
