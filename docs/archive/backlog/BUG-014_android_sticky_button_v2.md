# BUG-014: Persistent Android Sticky Button (Phase 2)

## Problem / Goal
Despite focus prevention in v1.2.15, the "Shortlist" button on Android physical devices remains in a "pressed" visual state after being clicked. This suggests that either `e.preventDefault()` is being overridden by Obsidian/Android, or the "Stickiness" is caused by a persistent `:hover` state that Android Chrome doesn't clear until another element is touched.

## Current Behavior
The "Shortlist" button stays highlighted in its accent color after advancing to the next task card. Touching another button clears it.

## Expected Behavior
The button should visually return to its idle state immediately after the card transition starts, matching the "Not Now" button's perceived behavior.

## Proposed Test Case (TDD)
- [ ] E2E Test: `tests/e2e/journeys/mobile_triage_visual_reset.spec.ts`
  - Assert that after clicking "Shortlist", the button's computed background color is NOT the "active/hover" color after a short delay.
  - Specifically check for focus on the container.

## Context / Constraints
- Android System Webview behavior is the primary target.
- Must not break keyboard focus sovereignty (the container must still be focused).
