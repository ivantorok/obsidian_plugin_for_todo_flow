# BUG-016: Mobile: Keyboard and ghost space cover editor input

## Problem / Goal
When editing/renaming a task on mobile, the keyboard and an additional "empty space" cover the input field, preventing the user from seeing what they are typing.

## Current Behavior
Tapping the task title opens the rename input. The mobile keyboard appears, but a keyboard-sized empty block also appears on top of it, obstructing the view of the stack. The focused element is not correctly scrolled into the visible portion of the viewport.

## Expected Behavior
The focused input must remain visible at all times. The viewport should correctly adjust to the keyboard presence, and "Viewport Shifting" logic should center the active task card in the *available* visible space.

## Steps to Reproduce (for Bugs)
1. Open Daily Stack on mobile.
2. Tap a task title to rename.
3. Observe the keyboard and any "ghost" padding covering the input field.

## Proposed Test Case (TDD)
- [ ] E2E Test: `tests/e2e/journeys/mobile_keyboard_collision.spec.ts` - Trigger rename, check position of the input field relative to the viewport/keyboard boundaries.

## Context / Constraints
- Violates **Viewport Shifting** axiom.
- The fix should be applied at a high level (potentially in a common Svelte action or the main View wrapper) to ensure all inputs benefit.
