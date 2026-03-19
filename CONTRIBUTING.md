# Contributing

Thanks for considering a contribution.

## Development setup

1. Clone the repo.
2. Run `npm install`.
3. Run `npm run dev`.
4. Load plugin from your dev vault at `.obsidian/plugins/flash-navigator/`.

Reference:

- https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin

## PR expectations

- Link the issue and milestone item.
- Keep scope focused to one feature/fix.
- Include manual test notes (mode, viewport size, Vim mapping state).
- Update docs when behavior changes.
- Ensure CI build passes (`npm run build`).

## Coding notes

- Prefer CM6 state field/view plugin patterns for editor behavior.
- Use `registerX` cleanup patterns from Obsidian API.
- Verify against docs before merging:
  - https://docs.obsidian.md/Plugins/Editor/Editor+extensions
  - https://docs.obsidian.md/Plugins/Editor/View+plugins
  - https://docs.obsidian.md/Plugins/Editor/State+fields
