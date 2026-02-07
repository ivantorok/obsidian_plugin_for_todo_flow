# BUG-013: Sticky Triage Button Visual State

## Problem / Goal
When clicking the "Shortlist" button in the Mobile Triage View, the task card correctly swipes right and advances to the next task. However, the clicked button remains in its "active/pressed" visual state (CSS highlight) until another button is pressed.

## Current Behavior
The button is highlighted upon `pointerdown` or `click` but fails to clear its visual state because the card it belongs to is removed from the DOM (or recycled) while the button is still "theoretically" active in the browser's interaction state.

## Expected Behavior
The button should reset to its normal visual state immediately after the click action is registered, ensuring that when the next task card slides in, the UI is clean.

## Steps to Reproduce
1. Open Triage View on Mobile (simulated).
2. Tap the "Shortlist" button.
3. Observe the button state on the disappearing card (or the persistent highlight if it leaks).

## Proposed Test Case (TDD)
- [ ] E2E Test: `tests/e2e/journeys/mobile_triage_button_state.spec.ts` should verify the "Shortlist" button does not retain `hover` or `active` styles after a tap.

## Context / Constraints
- Involved: `src/views/TriageView.svelte`
- Axiom: **Visual Determinism** (The UI must accurately reflect the interaction state).
