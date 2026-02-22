# BUG-027: Daily Stack — Opens in Card Mode Instead of List Mode
**Capture Date**: `2026-02-22 08:49`

## Problem / Goal
Daily Stack opens with an expanded card (card/focus mode) instead of showing the list first. The user expects to see the full list as the default entry state.

## Current Behavior
Daily Stack initializes in focus/card mode, showing a single expanded task card immediately.

## Expected Behavior
Daily Stack opens in list mode. The user must explicitly select/tap a task to enter focus/card view.

## UX Governance Compliance
- **Rule Alignment**: `Focus Sovereignty` — the user decides when to drill down. The system MUST NOT assume drill-down intent on load.
- **Lean Single-Card Focus (Mobile)**: Focus mode is the result of an explicit user action, not the default state.

## Proposed Test Case (TDD)
- [ ] E2E Test: `should open Daily Stack in list mode by default`
- [ ] E2E Test: `should transition to card/focus mode only after user taps a task`

## Context / Constraints
- Component: `LeanStackView.svelte`, `StackView.svelte`
- Check the initial `viewMode` state on mount. It should default to `'list'` / `'architect'`, not `'focus'`.
