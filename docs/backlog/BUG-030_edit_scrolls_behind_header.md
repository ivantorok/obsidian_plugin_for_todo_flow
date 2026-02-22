# BUG-030: Stack List — Editing Element Scrolls Behind Header
**Capture Date**: `2026-02-22 08:49`

## Problem / Goal
When editing a task's title or start time in Stack list mode, the editable element scrolls up and hides behind the (oversized) header bar. The user cannot see what they are typing.

## Current Behavior
Activating an inline editor on a list item causes it to scroll off the top of the visible viewport, occluded by the header.

## Expected Behavior
The editing element scrolls into, and stays in, the visible area below the header. The `scrollIntoView` call must account for the header height offset.

## UX Governance Compliance
- **Rule Alignment**: `Viewport Shifting (Hardened)` — use `ViewportService` for all mobile editing interactions.
- **Editing Buffer (Sovereignty)**: A dynamic bottom buffer must be applied so `scrollIntoView({ block: 'center' })` works regardless of item position.

## Proposed Test Case (TDD)
- [ ] E2E Test: `should keep editing input visible after activation in Stack list mode`

## Context / Constraints
- Component: `LeanStackView.svelte`, `ViewportService.ts`, `StackView.svelte`
- Root issue may be compounded by BUG-028 (thick header). Fixing header height first may partially resolve this.
- Check `scrollIntoView` offset calculation, accounting for sticky header height.
