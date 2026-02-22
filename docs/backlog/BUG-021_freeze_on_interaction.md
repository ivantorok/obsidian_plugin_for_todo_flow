# BUG-021: Schedule Recalculation Jank during Gestures
**Capture Date**: `2026-02-13 11:38:02`

## Problem / Goal
The "Rock & Water" physics engine recalculates the schedule on every relevant change. When a user is performing a swipe or reorder gesture, these recalculations can saturate the Main Thread on mobile, causing the UI to stutter (Jank) and potentially drop the gesture.

## Current Behavior
The `SchedulerService` (or equivalent) reacts immediately to state changes, even those triggered by an ongoing gesture.

## Expected Behavior
The UI should feel butter-smooth (60fps) during gestures. The physics engine should "freeze" (defer recalculation) from the moment `touchstart` is detected until the final animation finishes or `touchend` occurs.

## Proposed Test Case (TDD)
- [x] Unit Test: Verify that `ScheduleManager.recalculate()` is NOT called when the `InteractionState` is `active`.
- [x] E2E Test: Monitor frame rate during a 200ms duration swipe; frame rate must stay above 50fps on throttled hardware.

## Reuse & Architectural Alignment
- **Utilities to Reuse**: `InteractionService`, `ViewportService`
- **Architectural Patterns**: **Intent Locking**.

## UX Governance Compliance
- **Rule Alignment**: **Interaction Sovereignty** (The current gesture owns the CPU).

## Context / Constraints
- Involved files: `src/services/ScheduleManager.ts`, `src/views/ArchitectStack.svelte`.
- **Note**: `FocusStack.svelte` is exempt from these recalculations as it bypasses the physics engine entirely per "Lean Mobile" axioms.
