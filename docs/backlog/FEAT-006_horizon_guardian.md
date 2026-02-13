# FEAT-006: The "Horizon" Guardian

## Problem / Goal
On mobile, it's easy to lose track of upcoming hard deadlines (anchored tasks). Users need a persistent "Psychological Anchor" to pace their current work.

## Expected Behavior
1.  A non-obtrusive bar at the top/bottom displays the title of the *next* upcoming anchored task.
2.  A live countdown (e.g., "14m") is shown next to the title.
3.  If the current task is already anchored, the Guardian explicitly shows the *following* anchor to maintain horizontal awareness.

## Proposed Test Case (TDD)
- [ ] Unit Test: `GuardianService.getNextAnchor` should filter for tasks with `isAnchored: true` and a start time in the future, skipping the "active" task.
- [ ] E2E Test: Should show "Meeting in 10m" even while "Task A" (also anchored) is active.

## Reuse & Architectural Alignment
- **Utilities to Reuse**: `moment` for countdown math.
- **Architectural Patterns**: Reactive Projection (derived state).

## UX Governance Compliance
- **Rule Alignment**: date scoping exception (anchored tasks are the exception where time metadata is crucial).
