# BUG-020: Mobile Selection Jump after Anchor

## Problem / Goal
On mobile, when double-tapping a task at the end of the list to anchor it, the selection jumps back to the first task in the stack. This makes it difficult for users to see the result of their action and forces unnecessary scrolling.

## Current Behavior
1. Open Mobile Stack View.
2. Scroll to the bottom of the list.
3. Double-tap a task to anchor it.
4. The task anchors successfully, but `focusedIndex` resets (or stays) in a way that the view jumps back to the top-most item.

## Expected Behavior
- The selection (`focusedIndex`) should remain on the task that was just manipulated.
- Exception: When archiving a task, the selection should stay "nearby" (e.g., the next available task index).

## Steps to Reproduce
1. Open Mobile Stack View with 5+ tasks.
2. Double-tap the 5th task to anchor it.
3. Observe the viewport/selection jump.

## Proposed Test Case (TDD)
- [ ] **E2E Test**: `mobile_selection_persistence.spec.ts`
    - Setup a stack with 10 tasks.
    - Double-tap the 10th task.
    - Verify that the 10th task remains focused and visible in the viewport.

## Reuse & Architectural Alignment
- **State Management**: Review `StackView.svelte`'s `executeGestureAction` and how it handles `update()` and `focusedIndex`.
- **Architectural Patterns**: Focus Sovereignty (stay on the task of intent).

## UX Governance Compliance
- **Focus Sovereignty**: Selection should reflect user intent and persist during state changes unless the item is removed (archived).

## Context / Constraints
- `StackView.svelte`
- `StackController.ts`
