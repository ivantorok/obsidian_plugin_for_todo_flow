# BUG-006: Mobile: Drag & Drop Precision and Selection State

## Problem / Goal
1. Drag and drop reordering on mobile is difficult to target (precision issues).
2. After a drag and drop operation, items remain in a "selected" or "focused" state, which is confusing.

## Current Behavior
- Finding the "gap" to drop a task is finicky on touch screens.
- The item that was moved remains highlighted/focused after the operation.

## Expected Behavior
- Improved "drop zone" detection (more lenient).
- Selection/focus should be cleared after a successful drag and drop on mobile.

## Steps to Reproduce (for Bugs)
1. Start a drag on mobile.
2. Attempt to drop between two tasks.
3. Observe difficulty in triggering the reorder.
4. After drop, observe the task remains focused.

## Proposed Test Case (TDD)
- [ ] E2E Test: Verify `focusedIndex` is reset or updated appropriately after drag.
- [ ] E2E Test: Verify drop detection with varied coordinates.

## Context / Constraints
- Precision might require visual feedback (ghost card) or wider hit areas.
- Resetting focus might impact desktop keyboard users if handled globally.
