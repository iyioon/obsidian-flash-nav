# Obsidian Flash Nav

Flash-style label navigation for Obsidian, inspired by `folke/flash.nvim` and built with CodeMirror 6 editor extensions.

## Current features

- Start flash mode from command palette: `Flash Nav: Start jump`
- Type a pattern, see label hints, press label to jump
- Controls: `Backspace` edit pattern, `Enter` jump current target, `Esc` cancel
- Vim-friendly workflow via Obsidian hotkeys or `.obsidian.vimrc`
- Configurable settings:
  - label alphabet
  - label reuse mode (none/lowercase/all)
  - label current match toggle
  - search direction (closest/forward/backward)
  - search scope (viewport/current line/document)
  - case sensitive and smart-case matching
  - auto-jump on single match
  - backdrop dim opacity

## Install for development

Based on the official Obsidian build workflow:
https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin

1. Clone this repository.
2. Run `npm install`.
3. Run `npm run dev` (watch mode) or `npm run build`.
   - Run `npm run test` for matcher/labeler unit checks.
4. Copy this repo into your vault plugin folder:
   - `<Vault>/.obsidian/plugins/obsidian-flash-nav/`
5. In Obsidian, enable Community plugins and turn on `Obsidian Flash Nav`.

## Vim mapping (`.obsidian.vimrc`)

If you use `obsidian-vimrc-support`, add this to your vault root `.obsidian.vimrc`:

```vim
" Optional: release default 's' behavior
nunmap s

" Alias Obsidian command id to a short ex command
exmap flash obcommand obsidian-flash-nav:flash-nav-start

" Map normal mode s to flash
nmap s :flash<CR>
```

Notes:

- Command id is `obsidian-flash-nav:flash-nav-start`.
- `<CR>` is required for ex command mappings in recent codemirror-vim versions.
- `obcommand` is provided by `obsidian-vimrc-support` and may change; fallback is direct Obsidian hotkey binding.
- Run `:obcommand` to inspect available command ids.

## Roadmap

- GitHub issues: https://github.com/iyioon/obsidian-flash-nav/issues
- GitHub milestones: https://github.com/iyioon/obsidian-flash-nav/milestones

## Contributing

When opening a PR:

1. Link the issue/milestone item.
2. Mention relevant Obsidian docs used for implementation decisions.
3. Include verification notes (mode tested, vault setup, expected behavior).

## References

- Obsidian build guide: https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin
- Editor extensions: https://docs.obsidian.md/Plugins/Editor/Editor+extensions
- View plugins: https://docs.obsidian.md/Plugins/Editor/View+plugins
- State fields: https://docs.obsidian.md/Plugins/Editor/State+fields
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- Submit plugin: https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin
- flash.nvim: https://github.com/folke/flash.nvim
