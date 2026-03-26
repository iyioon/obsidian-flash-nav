# Changelog

All notable changes to this project will be documented in this file.

## [0.2.3] - 2026-03-19

### Added

- Added settings for regular label color and active/current label color.
- Added reset buttons for label colors to restore to current theme accent color.

### Changed

- Improved label styling and width for clearer jump targets.

### Fixed

- Fixed flash backdrop overlay behavior while scrolling so dimming remains consistent for headings and regular text.
- Fixed dim layering so matching text and labels remain fully visible while flash is active.
- Fixed remaining review-bot typing issue related to `EditorView` error-type usage.

## [0.2.2] - 2026-03-19

### Changed

- Updated plugin description text to avoid including the word `Obsidian` per submission guidance.

## [0.2.1] - 2026-03-19

### Changed

- Updated plugin id to `flash-navigator` to comply with Obsidian submission requirement that plugin ids must not contain `obsidian`.
- Updated docs and Vim mapping command id references to `flash-navigator:flash-nav-start`.

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

- Initial plugin scaffold, build pipeline, and release metadata files.
- Flash jump command and viewport-based pattern matching MVP.
- Label rendering and jump-by-label workflow.
- Vim mapping documentation for `.obsidian.vimrc`.

### Fixed

- Initial stability fixes for update-loop and decoration ordering edge cases.
