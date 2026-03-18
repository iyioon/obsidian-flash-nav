# Obsidian Flash Nav Milestones

This roadmap is based on the official Obsidian plugin development guide and editor extension docs:

- Build a plugin: https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin
- Editor extensions overview: https://docs.obsidian.md/Plugins/Editor/Editor+extensions
- View plugins: https://docs.obsidian.md/Plugins/Editor/View+plugins
- State fields: https://docs.obsidian.md/Plugins/Editor/State+fields
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines

For each milestone below, verify implementation against the linked docs before marking done.

## Milestone 0 - Foundation and Dev Loop

Goal: stable plugin scaffold and repeatable local workflow.

Tasks:

- [x] Keep project structure aligned with the Obsidian build guide (`manifest.json`, `main.js` build output, `styles.css`).
- [x] Confirm `npm run dev` watch loop rebuilds on source changes.
- [x] Confirm plugin can be loaded from `.obsidian/plugins/obsidian-flash-nav/` in a dedicated dev vault.
- [x] Add command palette command for quick sanity check.
- [x] Add issue templates and labels for milestone tracking.

Exit criteria:

- A fresh clone can follow README setup and run plugin in a dev vault.

## Milestone 1 - Flash Jump MVP (Viewport, Exact Search)

Goal: basic flash-like jump with labels in current editor viewport.

Tasks:

- [x] Register a CM6 editor extension via `registerEditorExtension()` (follow editor extension guide).
- [x] Add plugin command: start flash mode.
- [x] Capture typed pattern while mode is active.
- [x] Find exact matches in visible viewport only.
- [x] Assign deterministic labels from configurable alphabet.
- [x] Render decorations for matches and labels.
- [x] Jump to target when label is typed.
- [x] Cancel with `Esc` and clear state/decorations.

Exit criteria:

- User can trigger flash mode, type, see labels, and jump without leaving editor in a broken state.

## Milestone 2 - CM6 State Model (StateField + ViewPlugin)

Goal: robust internal architecture using CM6 patterns recommended by Obsidian docs.

Tasks:

- [x] Move active flash state to a `StateField`.
- [x] Use `StateEffect` values for pattern updates, start/stop, and jump actions.
- [x] Add `ViewPlugin` for view-driven updates and cleanup.
- [x] Ensure no leaked listeners/decorations after plugin unload.
- [ ] Add unit-like tests for matcher and label assignment logic.

Exit criteria:

- Architecture follows the state field/view plugin guidance and handles repeated enable/disable cycles safely.

## Milestone 3 - Vim Workflow Integration

Goal: make flash mode ergonomic for Obsidian Vim users while preserving compatibility.

Tasks:

- [ ] Add optional keybind profile for Vim users (default off).
- [x] Provide command-first integration path that works without internals.
- [x] Experiment with mapping behavior for `s`-style trigger in Vim mode when possible.
- [x] Document known limitations versus `flash.nvim` features tied to Neovim internals.

Exit criteria:

- Vim users have a practical mapping workflow with clear docs and fallback behavior.

## Milestone 4 - Search Modes and UX

Goal: improve jump quality and usability.

Tasks:

- [x] Add forward/backward direction option.
- [x] Add current-line-only and viewport scope options.
- [x] Add autojump when a single match exists.
- [ ] Add optional fuzzy search mode.
- [x] Add settings tab with validation and defaults.

Exit criteria:

- Plugin has a polished settings-driven UX with safe defaults.

## Milestone 5 - Performance and Reliability

Goal: keep interactions fast on large notes and reduce regressions.

Tasks:

- [ ] Benchmark matching/decorations on large documents.
- [ ] Optimize recomputation to changed viewport/pattern only.
- [ ] Add stress tests for rapid typing and cancellation.
- [ ] Verify behavior in Source and Live Preview modes.
- [ ] Validate desktop and mobile behavior where possible.

Exit criteria:

- Flash mode remains responsive under realistic heavy notes.

## Current Active GitHub Issues

- Milestone 1 docs polish: `#8`
- Milestone 2 tests: `#6`
- Milestone 5 performance profiling: `#3`
- Milestone 6 release checklist: `#5`

Recently closed:

- Milestone 3 Vim reliability pass: `#1`
- Milestone 4 direction and scope: `#2`

## Milestone 6 - Release Readiness

Goal: release and community plugin submission readiness.

Tasks:

- [ ] Update `manifest.json` and `versions.json` for release version.
- [ ] Prepare release artifacts: `main.js`, `manifest.json`, `styles.css`.
- [ ] Ensure docs meet plugin guideline requirements.
- [ ] Publish GitHub release and test manual install.
- [ ] Prepare Obsidian community plugin submission PR.

Exit criteria:

- Repository is ready for release and submission according to plugin guidelines.
