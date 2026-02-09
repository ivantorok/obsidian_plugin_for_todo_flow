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
- [x] E2E Test: `tests/e2e/journeys/desktop_shortcut_conflict.spec.ts` - Open both views, press `a`, verify which model/view receives the event.
- [x] Unit Test: Resolved via context-aware delegation in `main.ts`.

## Resolution
- **Status**: Fixed
- **Shipped**: v1.2.27 (2026-02-09)
- **Fix**: Implemented context-aware logic in `add-task-to-stack` command to delegate to `TriageView` if it is sovereign.
- **Walkthrough**: [walkthrough.md](../../walkthrough.md)
