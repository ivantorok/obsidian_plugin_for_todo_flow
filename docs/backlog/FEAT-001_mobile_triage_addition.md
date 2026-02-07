# FEAT-001: Mobile: Chore Addition in Triage

## Problem / Goal
While performing triage on mobile, there is no direct way to add a new chore or pull an existing one into the triage pool without leaving the Triage view.

## Current Behavior
The user must exit the Triage view, go to the Daily Stack, use the "Quick Add" popup to add a task, and then return to Triage.

## Expected Behavior
The Triage view should provide a clear, one-touch action (e.g., a "Plus" button or a specific gesture) that opens the `QuickAddModal`. Any task added this way should be automatically included in the current triage session.

## Proposed Solution
- Add a floating action button (FAB) or a header icon in `TriageView.svelte` for adding chores.
- Ensure the `QuickAddModal` can target the triage context.

## Proposed Test Case (TDD)
- [ ] E2E Test: `tests/e2e/journeys/mobile_triage_add.spec.ts` - Verify that tapping the "Add" button opens the modal and the new task appears in the triage list.
- [ ] Unit Test: `src/__tests__/TriageController.test.ts` - Verify that the triage state updates when a new task is added.

## Context / Constraints
- Follow `UX_GOVERNANCE.md` for gesture shadowing (80px threshold).
- Ensure the UI remains "Rich" and minimal.
