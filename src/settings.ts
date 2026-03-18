import { App, PluginSettingTab, Setting } from "obsidian";
import type ObsidianFlashNavPlugin from "./main";

export interface FlashNavSettings {
  labelAlphabet: string;
  caseSensitive: boolean;
  smartCase: boolean;
  autoJumpSingleMatch: boolean;
  backdropOpacity: number;
}

export const DEFAULT_SETTINGS: FlashNavSettings = {
  labelAlphabet: "asdfghjklqwertyuiopzxcvbnm",
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
  merged.backdropOpacity = Math.max(0, Math.min(90, Number(merged.backdropOpacity ?? DEFAULT_SETTINGS.backdropOpacity)));

  return merged;
}

export class FlashNavSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: ObsidianFlashNavPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Flash Nav settings" });

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
