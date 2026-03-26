import { App, PluginSettingTab, Setting } from "obsidian";
import type ObsidianFlashNavPlugin from "./main";

export interface FlashNavSettings {
  labelAlphabet: string;
  labelReuseMode: "none" | "lowercase" | "all";
  labelCurrentMatch: boolean;
  labelBackgroundColor: string;
  currentLabelBackgroundColor: string;
  searchDirection: "closest" | "forward" | "backward";
  searchScope: "viewport" | "line" | "document";
  caseSensitive: boolean;
  smartCase: boolean;
  autoJumpSingleMatch: boolean;
  backdropOpacity: number;
}

export const DEFAULT_SETTINGS: FlashNavSettings = {
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

export function sanitizeLabelAlphabet(input: string): string {
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const rawChar of input.toLowerCase()) {
    if (rawChar.trim().length === 0) {
      continue;
    }
    if (!seen.has(rawChar)) {
      seen.add(rawChar);
      labels.push(rawChar);
    }
  }

  return labels.length > 0 ? labels.join("") : DEFAULT_SETTINGS.labelAlphabet;
}

export function normalizeSettings(raw: unknown): FlashNavSettings {
  const source = (raw ?? {}) as Partial<FlashNavSettings>;
  const merged: FlashNavSettings = {
    ...DEFAULT_SETTINGS,
    ...source
  };

  merged.labelAlphabet = sanitizeLabelAlphabet(merged.labelAlphabet ?? "");
  if (!["none", "lowercase", "all"].includes(String(merged.labelReuseMode))) {
    merged.labelReuseMode = DEFAULT_SETTINGS.labelReuseMode;
  }
  merged.labelCurrentMatch = Boolean(merged.labelCurrentMatch);
  const isHexColor = (value: unknown): value is string => {
    if (typeof value !== "string") {
      return false;
    }
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
  };
  if (!isHexColor(merged.labelBackgroundColor)) {
    merged.labelBackgroundColor = DEFAULT_SETTINGS.labelBackgroundColor;
  }
  if (!isHexColor(merged.currentLabelBackgroundColor)) {
    merged.currentLabelBackgroundColor = DEFAULT_SETTINGS.currentLabelBackgroundColor;
  }
  if (!["closest", "forward", "backward"].includes(String(merged.searchDirection))) {
    merged.searchDirection = DEFAULT_SETTINGS.searchDirection;
  }
  if (!["viewport", "line", "document"].includes(String(merged.searchScope))) {
    merged.searchScope = DEFAULT_SETTINGS.searchScope;
  }
  merged.backdropOpacity = Math.max(0, Math.min(90, Number(merged.backdropOpacity ?? DEFAULT_SETTINGS.backdropOpacity)));

  return merged;
}

export class FlashNavSettingTab extends PluginSettingTab {
  private resolveAccentColor(): string {
    const raw = getComputedStyle(document.body).getPropertyValue("--text-accent").trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)) {
      return raw;
    }

    const rgb = raw.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgb) {
      const toHex = (n: string) => Number(n).toString(16).padStart(2, "0");
      return `#${toHex(rgb[1] ?? "0")}${toHex(rgb[2] ?? "0")}${toHex(rgb[3] ?? "0")}`;
    }

    return "#3b82f6";
  }

  constructor(app: App, private readonly plugin: ObsidianFlashNavPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const accentColor = this.resolveAccentColor();

    new Setting(containerEl).setName("Flash nav").setHeading();

    new Setting(containerEl)
      .setName("Label alphabet")
      .setDesc("Ordered label characters used for jump targets.")
      .addText((text) => {
        text
          .setPlaceholder(DEFAULT_SETTINGS.labelAlphabet)
          .setValue(this.plugin.settings.labelAlphabet)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ labelAlphabet: value });
            text.setValue(this.plugin.settings.labelAlphabet);
          });
      });

    new Setting(containerEl)
      .setName("Label reuse mode")
      .setDesc("Reuse existing labels while refining search (flash.nvim-style).")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("none", "None")
          .addOption("lowercase", "Lowercase")
          .addOption("all", "All")
          .setValue(this.plugin.settings.labelReuseMode)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ labelReuseMode: value as FlashNavSettings["labelReuseMode"] });
          });
      });

    new Setting(containerEl)
      .setName("Label current match")
      .setDesc("Show label on the current primary match. Enter can always jump current match.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.labelCurrentMatch).onChange(async (value) => {
          await this.plugin.updateSettings({ labelCurrentMatch: value });
        });
      });

    new Setting(containerEl)
      .setName("Label color")
      .setDesc("Background color for regular jump labels.")
      .addColorPicker((picker) => {
        picker.setValue(this.plugin.settings.labelBackgroundColor || accentColor).onChange(async (value) => {
          await this.plugin.updateSettings({ labelBackgroundColor: value });
        });
      })
      .addButton((button) => {
        button
          .setButtonText("Reset")
          .setTooltip("Reset to Obsidian accent color")
          .onClick(async () => {
            await this.plugin.updateSettings({ labelBackgroundColor: accentColor });
            this.display();
          });
      });

    new Setting(containerEl)
      .setName("Current label color")
      .setDesc("Background color for the active label jumped by enter.")
      .addColorPicker((picker) => {
        picker.setValue(this.plugin.settings.currentLabelBackgroundColor || accentColor).onChange(async (value) => {
          await this.plugin.updateSettings({ currentLabelBackgroundColor: value });
        });
      })
      .addButton((button) => {
        button
          .setButtonText("Reset")
          .setTooltip("Reset to Obsidian accent color")
          .onClick(async () => {
            await this.plugin.updateSettings({ currentLabelBackgroundColor: accentColor });
            this.display();
          });
      });

    new Setting(containerEl)
      .setName("Search direction")
      .setDesc("Choose how matches are prioritized relative to cursor position.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("closest", "Closest")
          .addOption("forward", "Forward")
          .addOption("backward", "Backward")
          .setValue(this.plugin.settings.searchDirection)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ searchDirection: value as FlashNavSettings["searchDirection"] });
          });
      });

    new Setting(containerEl)
      .setName("Search scope")
      .setDesc("Limit search to viewport, current line, or full document.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("viewport", "Viewport")
          .addOption("line", "Current line")
          .addOption("document", "Whole document")
          .setValue(this.plugin.settings.searchScope)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ searchScope: value as FlashNavSettings["searchScope"] });
          });
      });

    new Setting(containerEl)
      .setName("Case sensitive")
      .setDesc("Match pattern with exact case.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.caseSensitive).onChange(async (value) => {
          await this.plugin.updateSettings({ caseSensitive: value });
          this.display();
        });
      });

    new Setting(containerEl)
      .setName("Smart case")
      .setDesc("When case sensitive is off, uppercase in pattern enables case-sensitive matching.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.smartCase)
          .setDisabled(this.plugin.settings.caseSensitive)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ smartCase: value });
          });
      });

    new Setting(containerEl)
      .setName("Auto jump single match")
      .setDesc("Automatically jump when only one match remains.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autoJumpSingleMatch).onChange(async (value) => {
          await this.plugin.updateSettings({ autoJumpSingleMatch: value });
        });
      });

    new Setting(containerEl)
      .setName("Backdrop dim opacity")
      .setDesc("How strongly non-matching text is dimmed while flash is active.")
      .addSlider((slider) => {
        slider
          .setLimits(0, 90, 1)
          .setValue(this.plugin.settings.backdropOpacity)
          .setDynamicTooltip()
          .onChange(async (value) => {
            await this.plugin.updateSettings({ backdropOpacity: value });
          });
      });
  }
}
