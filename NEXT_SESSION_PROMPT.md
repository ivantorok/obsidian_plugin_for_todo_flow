# NEXT SESSION PROMPT (v43)

## Forensic Briefcase from v42 (Sync Fortress)

**STATUS**: 22/22 E2E specs GREEN. Exit code 0. All 3 previously-skipped specs hardened and passing.

### What Was Done
- **`drill-down.spec.ts`**: Replaced `browser.keys` with `view.onNavigate()` / `navManager.goBack()`. Zero browser.pause.
- **`bug_007_verify.spec.ts`**: Replaced CSS `.title` selector with `view.getTasks()` API. Uses `data-persistence-idle` for sync.
- **`selective_flush.spec.ts`**: Replaced `browser.keys(['z'])` with `window.dispatchEvent(KeyboardEvent)`. Uses vault indexing wait.
- **`wdio.conf.mts`**: Exclude list reduced to only `manual-open.spec.ts` and `legacy/**/*.spec.ts`.

### Key Gotchas Documented (E2E_TESTING.md #10-12)
1. `browser.keys` → `browser.execute` (Electron event propagation race)
2. `browser.pause` → `browser.waitUntil` (deterministic polling)
3. CSS class selectors → `view.getTasks()` or `data-testid` (selector drift)
4. **NEW**: Synthetic `KeyboardEvent` has null `target` — must dispatch on `window`, not call `handleKeyDown()` directly
5. **NEW**: Vault files written via `fs.writeFileSync` after `reloadObsidian` need `waitUntil` for `app.vault.getMarkdownFiles()`

### Suggested v43 Missions
1. **Ship v1.2.153**: Green baseline secured. Run `./ship.sh`.
2. **Architecture Pivot**: With all E2E specs green, consider the next macro-feature (Substack Hierarchy, Calendar Integration, etc.)
3. **Legacy Cleanup**: The `tests/e2e/legacy/` directory still contains the original flaky versions. Consider deleting them now that hardened replacements exist.
