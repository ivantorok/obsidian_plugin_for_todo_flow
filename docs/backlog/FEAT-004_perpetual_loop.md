# FEAT-004: Perpetual Loop & Victory Lap

## Problem / Goal
Currently, the mobile "Lean Stack" stops at the final task, which can break the user's flow and momentum. We need a way to maintain focus without the "hard stop."

## Expected Behavior
1.  When clicking `NEXT` on the final task, the view should wrap around to the first incomplete task.
2.  Between the final task and the wrap-around, a "Victory Lap" card must be displayed.
3.  The "Victory Lap" card shows a "Bird's Eye View" of the entire stack file (all tasks and their current states).
4.  The card provides buttons to "Restart Loop" or "Close Session."

## Proposed Test Case (TDD)
- [ ] Unit Test: `LoopManager.resolveNextIndex` should return 0 if current is last and loop is enabled.
- [ ] E2E Test: Clicking NEXT on Task 2 (last) should show the Victory Lap card with the full list.

## Reuse & Architectural Alignment
- **Utilities to Reuse**: `StackLoader` for the bird's eye view data.
- **Architectural Patterns**: Reactive Projection.

## UX Governance Compliance
- **Rule Alignment**: Aligns with "Focus Sovereignty" by keeping the user within the `LeanStackView` environment.

## Context / Constraints
- Svelte 5 Runes for indices.
