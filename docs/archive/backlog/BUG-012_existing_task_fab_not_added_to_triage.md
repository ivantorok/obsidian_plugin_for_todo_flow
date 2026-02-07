# BUG-012: Mobile: Existing Task Selection via FAB Doesn't Add to Triage Queue

## Problem / Goal
When using the FAB (+) on mobile during triage, selecting an *existing* task does not append it to the triage queue. Creating a *new* task works correctly.

## Current Behavior
1. User taps FAB (+) during triage.
2. User selects an **existing task** from the picker.
3. Task is **not** added to the triage queue.

## Expected Behavior
1. User taps FAB (+) during triage.
2. User selects an **existing task** from the picker.
3. Task **is** appended to the end of the triage queue (same as creating a new task).

## Steps to Reproduce
1. Open Obsidian Mobile.
2. Start triage (`start-triage` command).
3. Tap the FAB (+).
4. Select an **existing** task (not "Create new").
5. Observe: task is not in the queue.

## Proposed Test Case (TDD)
- [ ] E2E Test: `tests/e2e/journeys/mobile_triage_existing_task.spec.ts` - Verify that selecting an existing task via FAB adds it to the triage queue.
- [ ] Unit Test: `src/__tests__/TriageController.test.ts` - Verify that `addExistingTask()` correctly appends to the queue.

## Context / Constraints
- Related to `TriageView.svelte` and FAB action handler.
- Compare code paths: "create new" vs "select existing".
- Verify the flow state is set to `dump` when selecting existing task.
