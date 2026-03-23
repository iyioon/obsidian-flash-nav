import { Plugin, Editor, MarkdownView, Notice } from "obsidian";
import { flashExtension, handleFlashKeydownOn, isFlashActiveOn, setFlashSettings, startFlashOn } from "./flash";
import { FlashNavSettingTab, normalizeSettings, type FlashNavSettings } from "./settings";

export default class ObsidianFlashNavPlugin extends Plugin {
  settings: FlashNavSettings = normalizeSettings(undefined);
  private keydownHandler = (event: KeyboardEvent): void => {
    const cm = this.resolveActiveEditorView();
    if (!isFlashActiveOn(cm)) {
      return;
    }

    const maybeView = cm as { hasFocus?: boolean };
    if (!maybeView.hasFocus) {
      return;
    }

    const consumed = handleFlashKeydownOn(cm, event);
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

  private resolveActiveEditorView(): unknown {
    const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!markdownView) {
      return null;
    }

    const editor = markdownView.editor as Editor & { cm?: unknown };
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
        const cm = (editor as Editor & { cm?: unknown }).cm ?? this.resolveActiveEditorView();
        if (!startFlashOn(cm)) {
          new Notice("Flash nav is only available in the Markdown editor.");
          return;
        }
      }
    });
  }

  onunload(): void {
    document.documentElement.style.removeProperty("--flash-nav-backdrop-opacity");
  }
}
