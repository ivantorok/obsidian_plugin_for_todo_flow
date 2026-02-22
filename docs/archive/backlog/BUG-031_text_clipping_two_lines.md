# BUG-031: Task Card — Text Clipping on Two-Line Titles
**Capture Date**: `2026-02-22 08:49`

## Problem / Goal
Task titles that wrap to two lines are visually clipped at the edges — the border-radius of the card is cutting off the extreme characters (letters at the left/right edges of the second line).

## Current Behavior
Two-line titles show truncated/cut-off characters at the horizontal edges due to `border-radius` + `overflow: hidden` interaction on the card container.

## Expected Behavior
All task title text is fully visible. `overflow` and `border-radius` must not clip text content.

## UX Governance Compliance
- **Rule Alignment**: `Content Containment` — all text content MUST be contained within component boundaries without clipping.
- **Mobile Card Anatomy**: Title is limited to 1-2 lines. Both lines must be fully readable.

## Proposed Test Case (TDD)
- [ ] Visual / Manual: Verify long titles wrapping to 2 lines are fully visible on mobile.

## Context / Constraints
- Component: task card CSS (`.task-card`, `.card-title` etc.) in `styles.css` or `LeanStackView.svelte`.
- Likely fix: add sufficient horizontal padding or use `overflow: visible` on the text container.
