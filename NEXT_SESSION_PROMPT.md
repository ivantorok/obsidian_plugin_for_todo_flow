# Handoff: Session v42

**Role**: Process Governor
**Status**: v1.2.152 SHIPPED. Session v41 (Mobile UX Sovereignty) complete.

## 🎯 Remaining Red State
The following specs are still skipped in `wdio.conf.mts`:

| Spec | Reason | Priority |
|---|---|---|
| `drill-down.spec.ts` | Keyboard event propagation race | HIGH — Gesture interaction |
| `bug_007_verify.spec.ts` | External file sync timing | MEDIUM — Sync reliability |
| `selective_flush.spec.ts` | Archive/reload race condition | MEDIUM — Persistence boundary |
| `legacy/**/*.spec.ts` | Quarantined legacy tests | LOW — Cleanup |
| `manual-open.spec.ts` | Standard manual skip | N/A |

## 🚀 Key Achievements (Session v41)
- **BUG-029 Hardened**: Min tap duration (80ms), velocity-based scroll detection (2px/ms), 500ms post-drag cooldown.
- **BUG-021 Extended**: `lockPersistence`/`unlockPersistence` wired into `TriageViewHardShell.svelte`.
- **BUG-027 Verified**: Default `viewMode: "architect"` confirmed.
- **4 E2E Specs Un-skipped**: All `mobile_triage_*.spec.ts` now pass (19/19 E2E green, 0 retries).

## ⚠️ Session v41 Gotchas (Documented in E2E_TESTING.md #10-12)
1. **CSS Selector Drift**: After Hard Shell refactors, `.shortlist` class no longer existed. Use `button=Label` text selectors or `data-testid` attributes instead of CSS class selectors.
2. **`dragAndDrop` is broken**: WDIO gesture simulation doesn't work in Obsidian Electron. Test user intent via button clicks.
3. **`browser.pause` → `waitUntil`**: Fixed timing is the #1 flakiness source. Always use polling.
4. **Persistence lock gaps**: Any component with `pointerdown`→`pointerup` must wire `lockPersistence`/`unlockPersistence`.
5. **Svelte `$props()` are silent**: Optional props don't error when missing — the feature just doesn't activate. Verify wiring end-to-end.

## 📚 Essential Reading
- [MISSION_LOG.md](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/protocol/roles/common/MISSION_LOG.md) — Session v41 Key Insights #1-6.
- [E2E_TESTING.md](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/E2E_TESTING.md) — Troubleshooting #10-12.
- [flaky_test_protocol.md](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/protocol/flaky_test_protocol.md) — Updated Continuous Improvement.

## 🎯 Candidate Missions for v42
1. **"Sync Fortress"** (Stability Warden): Un-skip `drill-down.spec.ts`, `bug_007_verify.spec.ts`, `selective_flush.spec.ts`. Apply the same `waitUntil` + button-click hardening pattern that worked in v41.
2. **"Legacy Purge"** (Architect): Remove quarantined legacy specs and dead code paths.
3. **Feature work** from the backlog (check `docs/backlog/`).
