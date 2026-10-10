# Contributing

Thanks for considering a contribution.

## Development setup

See [Development](docs/DEVELOPMENT.md) for Node 20 setup, dependency installation, build and test commands, loading the plugin in a development vault, and profiling.

## PR expectations

- Link the issue and milestone item.
- Keep scope focused to one feature/fix.
- Include manual test notes (mode, viewport size, Vim mapping state).
- Update docs when behavior changes.
- Run tests, lint, type checks, and the production build as described in [Development](docs/DEVELOPMENT.md).
- For release preparation, follow the [release process](docs/RELEASING.md) and record remaining manual checks.

## Coding notes

- Prefer CM6 state field/view plugin patterns for editor behavior.
- Use `registerX` cleanup patterns from Obsidian API.
- Verify against docs before merging:
  - https://docs.obsidian.md/Plugins/Editor/Editor+extensions
  - https://docs.obsidian.md/Plugins/Editor/View+plugins
  - https://docs.obsidian.md/Plugins/Editor/State+fields
