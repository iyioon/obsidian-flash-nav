# Manual Obsidian validation for issue #9

Use this checklist when testing changes to Vim selection behavior in Obsidian.
It covers the command bridge, keyboard capture, selection ranges, and scrolling
alongside the automated regression tests.

## Setup and evidence

- Use a disposable vault with Vim enabled and `obsidian-vimrc-support` installed.
- Load the candidate `main.js`, `manifest.json`, and `styles.css` in
  `.obsidian/plugins/flash-navigator/`, then reload the plugin.
- Record OS, Obsidian and installer versions, vimrc-support version, candidate
  commit/patch hash, editor mode (Live Preview or Source), and viewport size.
- Reproduce on Obsidian 1.12.7 if available, then check the supported release
  target. Record unavailable versions rather than treating them as tested.
- Configure the vault-root `.obsidian.vimrc`:

```vim
exmap flash obcommand flash-navigator:flash-nav-start
nmap s :flash<CR>
vmap s :flash<CR>
```

## Selection and command checks

- [ ] In `v`, `V`, and Ctrl-V modes, invoke `s` and jump forward, backward,
  across the anchor, to the same character/column, and to the last character.
  Verify both endpoints are included, whole lines or rectangular ranges are
  retained, and Vim still reports the correct visual submode.
- [ ] Repeat with an already reversed selection, empty lines, and short lines
  within a rectangular selection. Check endpoint clipping and primary cursor.
- [ ] Complete jumps by label, Enter, and single-match auto-jump. Then use a
  native Vim motion and yank; verify the moved selection remains functional.
- [ ] Immediately after a jump, execute a visual Ex range command before any
  other motion. Verify it uses the newly selected lines in forward and reverse
  selections and all three visual submodes.
- [ ] Run Flash again immediately while still visual. Verify the original
  anchor remains fixed. Repeat using a direct Obsidian command/hotkey.
- [ ] Exit visual mode with Escape, then invoke normal `s` immediately and
  after a delay. Verify only a cursor remains, with no stale selection.
- [ ] Cancel Flash by Escape, Backspace with an empty pattern, and Enter with
  no matches. The document must be unchanged and Flash decorations removed.
  An Ex invocation has already exited Vim visual mode; cancellation leaves
  that cursor in normal mode. A direct visual invocation retains its selection.
- [ ] Cancel an Ex prompt or execute an unrelated Ex command after a visual
  selection, then start Flash normally. Verify no old selection is revived.
- [ ] Check scrolling to an off-screen target in document scope, both editor
  modes, a second note, and a pop-out window. Verify labels and dimming clear.
- [ ] Disable Vim and check an ordinary selection extends from its anchor;
  invoke from a cursor and verify a normal jump.

Record pass/fail per case and any console errors. State which checks remain
pending before release approval; automated test success alone does not establish
app-level compatibility.

Keep `minAppVersion: 1.5.0` and `isDesktopOnly: false` as existing declarations;
neither proves that this candidate was tested on Obsidian 1.5.0 or mobile.
Record any untested compatibility targets explicitly when approving a release.
