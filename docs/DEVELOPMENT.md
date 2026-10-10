# Development

## Setup and checks

Follow the [Obsidian plugin build guide](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin). Clone this repository and use Node 20, matching the CI and release workflows.

Install the locked dependencies and run the checks from the repository root:

```bash
npm ci
npm run lint
npm run test
npm run typecheck
npm run build
npm run validate:release
```

For development with automatic rebuilds:

```bash
npm run dev
```

The production build writes `main.js` to the repository root. Tests cover matching and label assignment, visual selection behavior, and integration with the upstream CodeMirror Vim adapter under jsdom. They do not establish compatibility with Obsidian's bundled Vim adapter or its command bridge. Use the [manual Obsidian checklist](MANUAL-TESTING.md) to record app-level results.

`validate:release` checks version consistency, release notes, and the four upload assets after building. The build also includes type checking. Keep local recovery archives, release preparation, dependencies, caches, and prototype experiments out of commits; the root ignore rules exclude the known local directories.

## Load in a development vault

Use a disposable development vault. Copy `main.js`, `manifest.json`, and `styles.css` into:

```text
<Vault>/.obsidian/plugins/flash-navigator/
```

Enable Community plugins and turn on **Flash Navigator**. After rebuilding and copying updated files, reload the plugin to test them. See the [README](../README.md#install-and-set-up-vim) for Vim mode and Vimrc Support setup.

## Performance profiling

Enable compute profiling logs in Obsidian's developer console:

```js
globalThis.__FLASH_NAV_PROFILE__ = true
```

Disable them with:

```js
globalThis.__FLASH_NAV_PROFILE__ = false
```

When enabled, slow refresh cycles (at least 8 ms) log pattern length, match count, scope, and direction.

## Contributing and releases

Follow [Contributing](../CONTRIBUTING.md), link the relevant issue or milestone, and include verification notes: editor mode, vault setup, Vim mappings, viewport size, and expected behavior.

- [Issues](https://github.com/iyioon/obsidian-flash-nav/issues)
- [Milestones](https://github.com/iyioon/obsidian-flash-nav/milestones)
- [Release process](RELEASING.md)
- [Release workflow](../.github/workflows/release.yml)

## Implementation references

- [Editor extensions](https://docs.obsidian.md/Plugins/Editor/Editor+extensions)
- [View plugins](https://docs.obsidian.md/Plugins/Editor/View+plugins)
- [State fields](https://docs.obsidian.md/Plugins/Editor/State+fields)
- [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [Submit a plugin](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
- [flash.nvim](https://github.com/folke/flash.nvim)
