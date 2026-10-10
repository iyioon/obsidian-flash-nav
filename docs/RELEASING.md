# Releasing

Flash Navigator is already listed in [Obsidian Community](https://community.obsidian.md/plugins/flash-navigator). Publish updates through this repository's GitHub releases; an ordinary update does not require another initial listing submission. See the official [submission and release guide](https://docs.obsidian.md/plugins/releasing/submit-plugin).

## Prepare metadata and notes

1. Inspect live tags and releases before choosing an unused patch version.
2. Keep `manifest.json`, `package.json`, and both root version fields in `package-lock.json` aligned.
3. Review `minAppVersion` and `isDesktopOnly`. Keep existing declarations unless the implementation requires a change; record untested platforms and app versions.
4. Update `versions.json` and preserve all earlier entries. The [official versions reference](https://docs.obsidian.md/Reference/Versions) requires changes when the minimum app version changes; this repository also records every release for consistency.
5. Add concise notes to `docs/releases/<version>.md` and update `CHANGELOG.md`. An unreleased candidate must remain labelled as unreleased until publication.

The tag must be the exact `x.y.z` manifest version, without a `v` prefix. Obsidian reads the default branch's root manifest and downloads the assets from the matching release. Changing that manifest before the release is available can temporarily advertise a missing update, so complete the approved publication sequence promptly.

## Validate the candidate

Follow [Development](DEVELOPMENT.md) using Node 20 and the lockfile:

```bash
npm ci
npm run test
npm run lint
npm run typecheck
npm run build
npm run validate:release
```

Complete the [manual Obsidian checklist](MANUAL-TESTING.md) or explicitly record which checks remain pending before release approval. Upstream Vim/jsdom tests do not validate the app's bundled adapter, Vimrc Support command bridge, keyboard capture, or scrolling.

Obsidian [automatically reviews each update](https://obsidian.md/blog/future-of-plugins/) for code quality and security. The Community developer dashboard can preview a scan of a branch, tag, or commit and shows review failures. Local lint is useful but does not establish that the hosted scan passed. Check the dashboard when available and retain its actual result.

## Approve and publish

Before a commit, push, PR, About update, tag, release, or issue comment/closure, review the exact diff, validation, release notes, cleanup inventory, identity, and proposed actions. Keep a verified recovery copy until publication is confirmed. Use explicit file staging; do not stage recovery material, caches, dependencies, or the shortcut experiment.

After approval:

1. Recheck live `main` and the proposed tag to avoid overwriting new work.
2. Commit the reviewed files with your verified Git identity and push the approved branch. If using a PR, wait for checks and merge only as approved; never rewrite existing history.
3. Confirm the release commit is on default branch `main` and that CI passed.
4. Create a tag pointing to that exact commit and push only that tag. **Pushing it triggers publication.**
5. Monitor the Release workflow and verify its outcome.

The workflow accepts version-shaped tags, validates exact metadata and tag equality, and uploads these four files:

| Asset | Purpose |
| --- | --- |
| `main.js` | Required production plugin bundle |
| `manifest.json` | Required install metadata |
| `styles.css` | Styling used by this plugin; optional in the general Obsidian specification |
| `versions.json` | Extra release attachment; the compatibility lookup uses the repository-root file |

Release notes come from `docs/releases/<version>.md`; missing or empty assets fail validation. Manual workflow dispatch checks a candidate and does not publish a branch run.

## Verify publication and finish cleanup

Verify the published tag's commit, release version, asset names/sizes/checksums, attached manifest, default-branch manifest, and compatibility history. Check the public Community listing and its review/update status. If it cannot be checked without signing into the developer dashboard, report that result as pending.

Check for the update in Obsidian when app access is available. After release confirmation, carry out only the separately approved recoverable cleanup; keep source, tests, documentation, Git history, and required release assets.
