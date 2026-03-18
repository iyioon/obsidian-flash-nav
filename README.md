# Obsidian Flash Nav

Flash-style label-based navigation for Obsidian, inspired by `folke/flash.nvim` and implemented with Obsidian + CodeMirror 6 editor extensions.

## References used for this project

- Obsidian build guide: https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin
- Obsidian editor extensions: https://docs.obsidian.md/Plugins/Editor/Editor+extensions
- Obsidian view plugins: https://docs.obsidian.md/Plugins/Editor/View+plugins
- Obsidian state fields: https://docs.obsidian.md/Plugins/Editor/State+fields
- Obsidian plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- flash.nvim: https://github.com/folke/flash.nvim

Every milestone in this repo is expected to follow the Obsidian guides above.

## Current status

- Project scaffold is ready.
- Build pipeline is working.
- Flash mode MVP is available in the current editor viewport:
  - Start with command `Flash Nav: Start jump`
  - Type pattern
  - Press shown label letter to jump
  - `Backspace` edits pattern, `Enter` jumps to current target, `Esc` cancels
- Vim integration path:
  - Command `Flash Nav: Start jump (bind this to s in Vim normal mode)` is provided
  - You can bind it to `s` in Obsidian hotkeys/Vimrc workflow

## Development setup (from Obsidian build guide)

1. Clone this repo.
2. Run `npm install`.
3. Run `npm run dev` for watch mode or `npm run build` for production bundle.
4. Copy this folder into your dev vault plugin folder:
   - `<Vault>/.obsidian/plugins/obsidian-flash-nav/`
5. In Obsidian:
   - Settings -> Community plugins -> Turn on community plugins
   - Enable `Obsidian Flash Nav`
6. Use Command Palette -> `Flash Nav: Start jump`.

To emulate flash.nvim Vim flow (`s` to start):

- Bind `Flash Nav: Start jump (bind this to s in Vim normal mode)` to `s` in your Vim mapping workflow.

Use a dedicated development vault as recommended by Obsidian docs.

## Milestones and issues

- Milestones: `docs/MILESTONES.md`
- Issue seed list: `docs/ISSUES.md`

## Project structure

- `src/main.ts` - plugin entry point
- `manifest.json` - plugin metadata
- `styles.css` - optional plugin styles
- `esbuild.config.mjs` - bundling configuration
- `docs/MILESTONES.md` - roadmap
- `docs/ISSUES.md` - issue breakdown

## Contributing workflow

When opening a PR:

1. Mention which milestone task it closes.
2. Link to the specific Obsidian guide section used.
3. Include test notes (how behavior was verified in Obsidian).
4. Keep scope focused to one issue when possible.
