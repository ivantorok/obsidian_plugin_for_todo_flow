# UI-002: Stack View: Long task titles overflow cards

## Problem / Goal
Long task titles overflow horizontally, going beyond the card boundaries and sometimes off the screen edge.

## Current Behavior
Task titles in `StackView` do not have horizontal constraints or wrapping. Long strings push the card's width or simply overflow the container.

## Expected Behavior
Task titles should either wrap to multiple lines or truncate with an ellipsis (`...`) within the card's content area.

## Steps to Reproduce (for Bugs)
1. Create a task with a very long title (e.g., 100+ characters).
2. Open the Stack View on mobile or a narrow desktop window.
3. Observe the overflow.

## Proposed Test Case (TDD)
- [ ] UI Test: Verify that long titles do not cause horizontal scrolling of the card or container.

## Context / Constraints
- New axiom: **Content Containment**. Text must stay within its layout boundaries.
