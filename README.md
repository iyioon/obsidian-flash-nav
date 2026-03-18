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
  - Bind command `Flash Nav: Start jump` to `s` in Obsidian hotkeys/Vimrc workflow

## Settings

Open Settings -> Community plugins -> Obsidian Flash Nav to configure:

- Label alphabet
- Case sensitive matching
- Smart case matching
- Auto jump when a single match remains
- Backdrop dim opacity

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

- Bind `Flash Nav: Start jump` to `s` in your Vim mapping workflow.

## Bind to `.obsidian.vimrc` exactly

If you use the `obsidian-vimrc-support` plugin, add this to your vault root `.obsidian.vimrc` file (not inside `.obsidian/`):

```vim
" Optional: free the default 's' behavior first
nunmap s

" 1) Alias a short Ex command to the Obsidian command id
exmap flash obcommand obsidian-flash-nav:flash-nav-start

" 2) Map normal-mode 's' to the alias
" IMPORTANT: include <CR> on recent Obsidian/codemirror-vim versions
nmap s :flash<CR>
```

Notes:

- The command id is `obsidian-flash-nav:flash-nav-start`.
- If `s` is already used by another Vim mapping/plugin, keep `nunmap s`.
- You can map a different key if preferred, e.g. `nmap <leader>s :flash<CR>`.
- Reload Vimrc plugin or restart Obsidian after editing `.obsidian.vimrc`.
- `obcommand` comes from `obsidian-vimrc-support` and can break on plugin/internal changes; fallback is binding `Flash Nav: Start jump` directly in Obsidian Hotkeys.
- You can run `:obcommand` in normal mode to inspect currently available command ids.

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
