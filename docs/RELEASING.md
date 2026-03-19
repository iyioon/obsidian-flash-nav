# Releasing

This project follows the Obsidian community plugin release flow.

References:

- https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin
- https://github.com/obsidianmd/obsidian-releases

## 1) Prepare version metadata

1. Update `manifest.json`:
   - `version`
   - `minAppVersion` (if needed)
2. Update `versions.json` with a mapping for the new version.

Rule: Git tag must exactly match `manifest.json` `version`.

## 2) Validate release build

Run:

```bash
npm run test
npm run build
```

Confirm release files exist and are current:

- `main.js`
- `manifest.json`
- `styles.css` (if used)

## 3) Update changelog and docs

1. Add release notes entry in `CHANGELOG.md`.
2. Ensure README reflects current features and settings.
3. Ensure Vim mapping docs are accurate.

## 4) Create GitHub release

1. Commit and push changes to `main`.
2. Create tag matching plugin version (example `0.2.0`).
3. Push tag; GitHub Actions release workflow will:
   - run `npm run test`
   - run `npm run build`
   - verify tag matches `manifest.json` version
   - publish GitHub Release with:
     - `main.js`
     - `manifest.json`
     - `styles.css`
     - `versions.json`

Commands:

```bash
git tag 0.2.0
git push origin 0.2.0
```

## 5) Submit/update in `obsidian-releases`

For first submission (or metadata updates), open PR to:

- `obsidianmd/obsidian-releases`
- file: `community-plugins.json`

Entry format:

```json
{
  "id": "flash-navigator",
  "name": "Flash Navigator",
  "author": "iyioon",
  "description": "Flash-style label-based navigation with Vim workflows.",
  "repo": "iyioon/obsidian-flash-nav"
}
```

## 6) Post-release verification

1. Verify release assets are downloadable from GitHub release.
2. Verify `manifest.json` and tag version match.
3. If listed in community plugins, verify install/update in a clean vault.
