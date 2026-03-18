import { Plugin, Editor, MarkdownView, Notice } from "obsidian";
import { EditorView } from "@codemirror/view";
import { flashExtension, handleFlashKeydownForView, isFlashActive, setFlashSettings, startFlash } from "./flash";
import { FlashNavSettingTab, normalizeSettings, type FlashNavSettings } from "./settings";

export default class ObsidianFlashNavPlugin extends Plugin {
  settings: FlashNavSettings = normalizeSettings(undefined);
  private keydownHandler = (event: KeyboardEvent): void => {
    const cm = this.resolveActiveEditorView();
    if (!cm || !isFlashActive(cm)) {
      return;
    }

    if (!cm.hasFocus) {
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

  private attachGlobalKeyHandler(win: Window): void {
    this.registerDomEvent(win.document, "keydown", this.keydownHandler, {
      capture: true
    });
  }

  private applyRuntimeSettings(): void {
    setFlashSettings(this.settings);
    document.documentElement.style.setProperty(
      "--flash-nav-backdrop-opacity",
      `${Math.max(0, Math.min(90, this.settings.backdropOpacity)) / 100}`
    );
  }

  async updateSettings(next: Partial<FlashNavSettings>): Promise<void> {
    this.settings = normalizeSettings({
      ...this.settings,
      ...next
    });
    await this.saveData(this.settings);
    this.applyRuntimeSettings();
  }

  async loadSettings(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
  }

  private resolveActiveEditorView(): EditorView | null {
    const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!markdownView) {
      return null;
    }

    const editor = markdownView.editor as Editor & { cm?: EditorView };
    return editor.cm ?? null;
  }

  async onload() {
    await this.loadSettings();
    this.applyRuntimeSettings();

    this.registerEditorExtension(flashExtension);
    this.addSettingTab(new FlashNavSettingTab(this.app, this));

    this.attachGlobalKeyHandler(window);
    this.registerEvent(
      this.app.workspace.on("window-open", (_workspaceWindow, openedWindow) => {
        this.attachGlobalKeyHandler(openedWindow);
      })
    );

    this.addCommand({
      id: "flash-nav-start",
      name: "Start jump",
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

  onunload(): void {
    document.documentElement.style.removeProperty("--flash-nav-backdrop-opacity");
  }
}
