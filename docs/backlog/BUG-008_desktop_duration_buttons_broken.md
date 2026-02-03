# BUG-008: Desktop: Duration adjustment buttons not working

## Problem / Goal
The duration adjustment buttons (+/-) on desktop have stopped working. Clicking them does not change the task duration.

## Current Behavior
Clicking the "+", "-", "+5", or "-5" buttons on a task card in Desktop mode does nothing.

## Expected Behavior
Clicking these buttons should adjust the task duration by the specified amount and update the schedule.

## Steps to Reproduce (for Bugs)
1. Open Todo Flow Stack View on Desktop.
2. Click any of the duration adjustment buttons on a task.
3. Observe that the duration remains the same.

## Proposed Test Case (TDD)
- [ ] E2E Test: Click duration buttons on Desktop and verify duration value change.

## Context / Constraints
- Likely a regression from recent mobile event handling changes (pointer events vs click events).
- Priority: HIGH (Core functionality broken on desktop).
