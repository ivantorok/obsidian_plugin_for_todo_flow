# BUG-001: Desktop: Triage Shortcut Focus Leak

## Problem / Goal
The shortcut `a` (Add Task) is intercepted by the background Stack view instead of the active Triage view when both are open.

## Current Behavior
When the Triage view is open on top of (or alongside) the Daily Stack on Desktop, pressing `a` opens the `QuickAddModal` contextually for the Stack, adding the task to the stack instead of the triage pool.

## Expected Behavior
Shortcut commands should respect the "Active View" hierarchy. If Triage is active/focused, `a` must trigger the "Add to Triage" flow.

## Steps to Reproduce
1. Open Obsidian on Desktop.
2. Open the Daily Stack.
3. Open the Triage view.
4. Press `a`.
5. Observe that the task is added to the Stack, not the Triage.

## Proposed Test Case (TDD)
- [ ] E2E Test: `tests/e2e/journeys/desktop_shortcut_conflict.spec.ts` - Open both views, press `a`, verify which model/view receives the event.
- [ ] Unit Test: `src/__tests__/KeybindingManager.test.ts` - Mock multiple active views and verify priority resolution.

## Context / Constraints
- Violates **Focus Sovereignty** axiom in `UX_GOVERNANCE.md`.
- Requires coordination in `KeybindingManager.ts`.
