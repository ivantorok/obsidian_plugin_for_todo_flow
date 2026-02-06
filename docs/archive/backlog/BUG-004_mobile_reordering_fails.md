# BUG-004: Mobile: Reordering fails

## Problem / Goal
Drag and drop reordering of tasks does not work on mobile.

## Current Behavior
Attempting to drag a card on mobile does not initiate a drag or fails to reorder upon drop.

## Expected Behavior
Smooth drag and drop reordering on touch devices.

## Steps to Reproduce (for Bugs)
1. Open Todo Flow on Obsidian Mobile.
2. Long-press or drag a task card to reorder.
3. Observe that reordering is not completed.

## Proposed Test Case (TDD)
- [ ] E2E Test: Verify touch-based drag and drop in mobile emulation.

## Context / Constraints
- This was recently touched in a "Mobile Navigation Fixes" session. May be a regression.
