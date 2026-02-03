# BUG-005: Mobile: Duration values do not follow standard sequence

## Problem / Goal
The duration buttons (+/-) on mobile do not follow the expected sequence of values (2, 5, 10, 15, 20, 30, 45, 1h, 1h30m, 2h, 3h, etc.). Currently, they likely use a fixed increment/decrement.

## Current Behavior
Tapping the duration adjustment buttons increments or decrements by a fixed number of minutes (e.g., 5 or 15), ignoring the non-linear "natural" sequence users expect.

## Expected Behavior
The +/- buttons should move the task's duration to the next or previous value in the defined sequence: `[2, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, ...]`.

## Steps to Reproduce (for Bugs)
1. Open Todo Flow on mobile.
2. Observe a task with 15m duration.
3. Tap "+" and observe it goes to 30m (if 15 is increment) instead of the next logical step if they were different. (Actual sequence needs implementation).

## Proposed Test Case (TDD)
- [ ] Unit Test: `durationStepper.next(15)` should return `20`.
- [ ] Unit Test: `durationStepper.prev(60)` should return `45`.

## Context / Constraints
- Logic should reside in a utility class or the controller to be shared between mobile and desktop if possible.
