# FEAT-002: Mobile Stack View Refinements

## Problem / Goal
The current mobile Stack View needs refinement to improve information density and usability. Users report issues with card layout readability, lack of context when navigating child stacks, and difficulty executing the double-tap gesture.

## Current Behavior
- **Card Layout**: Task title can take up many lines; metadata is not consistently organized.
- **Header**: Child stacks do not clearly indicate the parent task context.
- **Gestures**: Double-tap timeout is too short (currently mixed ~250-300ms), making the "Anchor" gesture difficult to execute reliably.
- **Date**: Date is displayed on mobile cards, cluttering the view.
- **Edit Button**: The time edit pencil is always visible, even when not needed.

## Expected Behavior
1.  **Card Layout (Mobile)**:
    - Task title limited to 1-2 lines (truncate/clamp if longer).
    - Metadata (Start Time, Duration, Anchor Icon) moves to a dedicated 2nd or 3rd line.
    - **Date Hidden**: Date should NOT be displayed on mobile cards (keep for desktop).
2.  **Header Context**:
    - When inside a child stack, the header must display the **Parent Task Name** (truncated if necessary) to provide context.
3.  **Conditional Edit Button**:
    - The Time Edit (Pencil) button should ONLY be visible if the task is **Anchored**.
4.  **Gesture Tuning**:
    - Increase Double-Tap detection window to **450ms** (or user configurable/slower) to accommodate relaxed input speeds.

## Proposed Test Case (TDD)
- [ ] **E2E Test**: `mobile_stack_layout.spec.ts`
    - Verify Title is clamped (visual check or class check).
    - Verify presence of Metadata Line elements.
    - Verify Date is hidden on mobile emulation.
    - Verify Header text matches Parent Task when navigating down.
    - Verify Double-Tap triggers anchor even with 400ms delay between clicks.

## Reuse & Architectural Alignment
- **Utilities**: Use existing `Card.svelte` structure but introduce conditional "mobile" variant or CSS classes.
- **State**: Use `ViewManager` or `StackController` to pass parent context to the view.

## UX Governance Compliance
- **Focus Sovereignty**: Ensure metadata changes don't distract from the active task.
- **Gesture Hierarchy**: Relaxing the double-tap window must not interfere with single-tap navigation (ensure debounce/wait logic is robust).
