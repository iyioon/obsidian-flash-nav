# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-18

### Added

- Initial Obsidian plugin scaffold with build pipeline.
- Flash jump command and viewport-based pattern matching.
- Label rendering and jump-by-label workflow.
- Vim mapping documentation for `.obsidian.vimrc`.
- Settings for label alphabet, case sensitivity, smart-case, auto-jump, and backdrop opacity.
- Label reuse controls (`none`, `lowercase`, `all`) and current-label toggle.
- Search direction controls (`closest`, `forward`, `backward`).
- Search scope controls (`viewport`, `line`, `document`).

### Changed

- Hardened key capture behavior for Vim normal-mode usage.
- Improved active-mode visual feedback.
- Overlay-style label rendering to avoid shifting surrounding text.
- Label anchoring moved to the next character after matched text, with safe fallback at line end.

### Fixed

- Prevented CM6 re-entrant update dispatch errors.
- Fixed decoration ordering errors in range builder.
- Fixed numeric pattern input handling while flash mode is active.
- Fixed label visual placement/alignment issues across themes.
