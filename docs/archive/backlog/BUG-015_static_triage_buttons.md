# BUG-015: Static Triage Buttons

## Problem / Goal
Previous attempts to fix the "sticky" highlight on Android triage buttons via focus management (BUG-013) and manual state management (BUG-014) have failed to provide a stable result on actual hardware. The user suggests removing the interaction-based color change entirely.

## Current Behavior
The buttons change color when pressed, but the color change often persists after the touch has ended, creating a "sticky" or "broken" feel.

## Expected Behavior
The buttons should have a consistent, static appearance. Feedback for the action should be provided by the card's swipe animation rather than the button's background color change.

## Proposed Test Case (TDD)
- [ ] E2E Test: Modify `tests/e2e/journeys/mobile_triage_visual_reset.spec.ts`
  - Assert that clicking the button does NOT result in any CSS property change for background-color.

## Context / Constraints
- No background color change on `:active`, `:hover`, or `.is-active`.
- Must explicitly disable `-webkit-tap-highlight-color`.
- Maintain keyboard focus sovereignty (invisible but functional).
