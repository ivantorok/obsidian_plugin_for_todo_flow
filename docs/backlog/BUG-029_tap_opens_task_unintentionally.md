# BUG-029: Touch — Any Touch Immediately Opens Task (Drill-Down Intent Ambiguity)
**Capture Date**: `2026-02-22 08:49`

## Problem / Goal
Any touch on a task card immediately triggers drill-down (opens the task in focus/card mode), even when the user's intent is to scroll, reorder, or simply inspect the list. This is the **#1 reported UX issue**.

## Current Behavior
- `touchstart` / `tap` on a card body opens the task card immediately.
- After drag-and-drop (reorder), releasing the card also opens it (intent bleed).
- During scroll, tapping also opens a task.

## Expected Behavior
- **Scroll**: Scrolling MUST pass through without opening any task.
- **Reorder**: Releasing a drag MUST NOT trigger open. The interaction is complete when the item is dropped.
- **Open**: A deliberate tap (not starting a scroll or drag) opens the task. Use a short delay or movement threshold to disambiguate.

## UX Governance Compliance
- **Rule Alignment**: `Focus Sovereignty` — the user controls when to drill down. The system MUST NOT assume intent.
- **Gesture Hierarchy**: `Drift Tolerance` — vertical movement must pass through. Touch-start must set a pending state, not an immediate action.
- **Handle Priority**: Drag handle interaction MUST remain in Reorder Mode until released; release MUST NOT re-trigger open.

## Related Issues
- BUG-006 (Mobile drag precision) — partially overlaps.
- FEAT-009 (Lean Mobile Split) — structural fix that would eliminate the event ambiguity at the root.

## Proposed Test Case (TDD)
- [ ] E2E Test: `should not open task when user scrolls over it`
- [ ] E2E Test: `should not open task after drag-and-drop reorder`
- [ ] E2E Test: `should open task only on deliberate tap (no movement)`

## Context / Constraints
- Component: `LeanStackView.svelte`, `gestures.ts`, `StackView.svelte`
- Introduce an intent-disambiguation pattern (e.g., tap-up + no-movement-threshold).
