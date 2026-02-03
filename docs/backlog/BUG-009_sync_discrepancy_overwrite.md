# BUG-009: Sync: CurrentStack.md discrepancy and overwrite issues

## Problem / Goal
The Daily Stack content differs between desktop and mobile despite Obsidian Sync. Synced changes to `CurrentStack.md` are ignored by the UI, and local edits often overwrite remote changes.

## Current Behavior
1. Obsidian Sync pulls an updated `CurrentStack.md` to the local device.
2. The plugin's watcher detects the modification and calls `view.reload()`.
3. `view.reload()` captures the current in-memory state (including navigation history).
4. `view.setState()` sees the navigation history and restores the **old** task list from memory instead of reading the **new** file from disk.
5. If the user then performs any action (e.g., reordering), the plugin saves its "stale" in-memory state, overwriting the synced file.

## Expected Behavior
An external modification to `CurrentStack.md` should trigger a genuine disk re-read that updates the UI with the remote state while attempting to preserve navigation depth if possible.

## Steps to Reproduce (for Bugs)
1. Open Todo Flow Stack View.
2. Manually edit `CurrentStack.md` (e.g., in an external editor) to remove a task.
3. Return to Obsidian; observe that the task remains in the UI.
4. Perform any action in the UI (e.g., toggle a checkbox); check `CurrentStack.md` again.
5. Observe that the manually removed task has returned (overwritten by stale state).

## Proposed Test Case (TDD)
- [ ] E2E Test: `tests/e2e/sync_robustness.spec.ts`
    - Open Stack View with 2 tasks.
    - Manually modify `CurrentStack.md` to have only 1 task via `app.vault.adapter.write`.
    - Wait for watcher.
    - Verify UI shows 1 task.

## Context / Constraints
- `StackView.ts`: `setState` logic needs to distinguish between "Initial Load/Nav" and "External Reload".
- Must preserve sub-task navigation context if the currently viewed sub-stack still exists in the new file.
