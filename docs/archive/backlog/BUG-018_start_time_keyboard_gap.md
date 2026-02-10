# BUG-018: Start Time Input Keyboard Gap (Grey Box)

## Problem / Goal
On mobile devices, when editing the **Start Time**, a grey box (empty space) appears above the keyboard, pushing the content up incorrectly or occluding the active input. This is a regression of the "Viewport Shifting" issue.

## Current Behavior
- Clicking the time edit pencil opens the input.
- The keyboard slides up.
- A "grey box" or gap appears, or the input is obscured/not centered correctly.
- This happens because the time input uses a standard `node.focus()` action via `selectOnFocus`, which triggers the browser's default scroll behavior but **misses** the hardened `ViewportService` logic (which waits 300ms for the keyboard animation to finish before re-centering).

## Expected Behavior
- When the Start Time input appears and focuses, the view should adjust gracefully.
- The input should remain visible and centered.
- No "grey gap" should persist above the keyboard.

## Steps to Reproduce
1.  Open Mobile Stack View.
2.  Tap the "Edit Start Time" (pencil) icon on a task.
3.  Observe the viewport behavior as the keyboard opens.

## Proposed Test Case (TDD)
- [ ] **E2E Test**: `mobile_viewport_correction.spec.ts` (or add to `mobile_keyboard_collision.spec.ts`)
    - Trigger start time edit.
    - Wait for keyboard.
    - assert that the input element is within the visual viewport and not occluded.

## Reuse & Architectural Alignment
- **Utilities**: `ViewportService.scrollIntoView(element)`
- **Fix**: Update `StackView.svelte`'s `selectOnFocus` (or the `startEditStartTime` flow) to call `ViewportService.scrollIntoView(containerEl)` or the input itself.

## UX Governance Compliance
- **Viewport Shifting**: The app must manually correct for the Virtual Keyboard Layout Shift (VKLS) using the 300ms delay pattern defined in `ViewportService`.
