# FEAT-007: Sovereign Undo (Back Icon)

## Problem / Goal
Mobile buttons are large and prone to accidental clicks ("Fat Finger"). Users need a simple way to revert an accidental DONE or PARK action.

## Expected Behavior
1.  A "Back" icon (curved arrow) is permanently visible in the navigation zone.
2.  Clicking it decrements the `currentIndex`.
3.  If the previous task was just modified (marked DONE/PARKED), it is restored to its previous state.

## Proposed Test Case (TDD)
- [ ] Unit Test: `LeanStackView.undo` should revert state change and index.
- [ ] E2E Test: Clicking DONE then clicking BACK should restore the task card to the screen as TODO.

## Reuse & Architectural Alignment
- **Utilities to Reuse**: `HistoryManager` (optionally) or local state reversal.
- **Architectural Patterns**: Input Neutrality (not a global keybinding, just a tap).

## UX Governance Compliance
- **Rule Alignment**: Selection Parity (re-sync index with model).
