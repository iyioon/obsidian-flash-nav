# Changelog

All notable changes to this project will be documented in this file.

## [0.2.3] - 2026-03-19

### Fixed

- Fixed flash backdrop overlay behavior while scrolling so dimming remains consistent for headings and regular text.

## [0.2.1] - 2026-03-19

### Changed

- Updated plugin id to `flash-navigator` to comply with Obsidian submission requirement that plugin ids must not contain `obsidian`.
- Updated docs and Vim mapping command id references to `flash-navigator:flash-nav-start`.

## [0.2.2] - 2026-03-19

### Changed

- Updated plugin description text to avoid including the word `Obsidian` per submission guidance.

## [0.2.0] - 2026-03-19

### Added

- Search direction and scope controls.
- Label reuse controls and current-label toggle.
- Unit tests for core matcher/labeler/placement logic.
- Demo GIF and release workflow documentation.
- Automated GitHub Actions release workflow for tag-based publishing.

### Changed

- Renamed plugin display name to `Flash Navigator`.
- Simplified command name to `Start jump`.
- Improved label rendering to avoid text shifting and better align with target glyphs.
- Added optional profiling logs for slow refresh cycles.

### Fixed

- Visual mode jump flow now preserves and extends selection anchor.
- Fixed label placement and dimming behavior during flash mode.
- Fixed numeric pattern input and refresh edge cases.

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
- Extracted pure flash core logic into `src/flash-core.ts` for testability.
- Added unit tests in `tests/flash-core.test.ts` and `npm run test` workflow.
- Added GitHub Actions release workflow for tag-based test/build/publish.

### Changed

- Hardened key capture behavior for Vim normal-mode usage.
- Improved active-mode visual feedback.
- Overlay-style label rendering to avoid shifting surrounding text.
- Label anchoring moved to the next character after matched text, with safe fallback at line end.
- Flash now preserves visual-mode anchor to allow selection extension on jump.
- Reduced redundant refresh dispatches by skipping unchanged flash state updates.
- Added optional dev profiling logs for slow flash recompute cycles.
- Renamed plugin display name to `Flash Navigator` and simplified command name to `Start jump`.

### Fixed

- Prevented CM6 re-entrant update dispatch errors.
- Fixed decoration ordering errors in range builder.
- Fixed numeric pattern input handling while flash mode is active.
- Fixed label visual placement/alignment issues across themes.
