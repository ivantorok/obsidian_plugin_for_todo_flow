# BUG-032: Start Time Edit — Does Not Anchor the Task
**Capture Date**: `2026-02-22 08:49`

## Problem / Goal
Editing a task's start time does not automatically mark the task as anchored. Since unanchored tasks have their start time recalculated by the schedule engine, any manual edit is immediately overwritten. This makes the feature feel broken and purposeless.

## Current Behavior
User edits the start time → field updates → schedule recalculation overwrites the value → edit appears to have no effect.

## Expected Behavior
Confirming a start time edit (pressing Enter or leaving the field) MUST automatically set the task's `anchored` flag to `true`, preventing the schedule engine from overwriting it.

## UX Governance Compliance
- **Rule Alignment**: `Focus Sovereignty` — user intent (manual time edit = anchor) must be respected and honoured persistently.
- **Optimistic UI Pattern**: The anchor state must update in the UI immediately upon edit confirmation.

## Proposed Test Case (TDD)
- [ ] Unit Test: `should set anchored=true when start time is manually edited`
- [ ] E2E Test: `should preserve manually set start time after schedule recalculation`

## Context / Constraints
- Component: `StackController.ts` (start time update handler), `LeanStackView.svelte`
- The fix is a one-liner in the start-time commit handler: set `anchored = true` alongside the time update.
