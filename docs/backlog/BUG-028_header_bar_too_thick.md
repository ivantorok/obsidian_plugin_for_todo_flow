# BUG-028: Header Bar — Excessive Height (List/Card Toggle, Count, Back Button)
**Capture Date**: `2026-02-22 08:49`

## Problem / Goal
The top header bar (containing the list/card toggle, task count, and back button) is too thick/tall, consuming excessive vertical space on mobile and causing elements to scroll off-screen when editing.

## Current Behavior
Header bar height is visually oversized. On mobile, this reduces the available viewport for content and causes editing elements to scroll behind/under the header (see also BUG-030).

## Expected Behavior
Header bar uses a compact/slim height, appropriate for mobile (e.g., 44px). All controls fit within a single slim bar without excessive padding.

## UX Governance Compliance
- **Rule Alignment**: Zero-Logic Rendering — presentational overhead must be minimized.
- **Mobile Card Anatomy**: Density principle applies to chrome elements too.

## Proposed Test Case (TDD)
- [ ] Visual / Manual: Header bar height ≤ 48px on mobile viewport.

## Context / Constraints
- Component: `LeanStackView.svelte` header section, `styles.css` header variables.
- May interact with BUG-030 (editing element scrolls under header).
