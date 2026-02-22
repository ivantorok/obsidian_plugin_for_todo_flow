# FEAT-010: Triage — "Select All / Shortlist All" Action
**Capture Date**: `2026-02-22 08:49`

## Problem / Goal
When reviewing many tasks in Triage, the user has no bulk action to shortlist all remaining items at once. This forces tedious one-by-one swiping when the intent is clear.

## Current Behavior
Each task must be individually swiped/actioned to be shortlisted.

## Expected Behavior
A "Shortlist All" CTA is available (e.g., a button at the top/bottom or a long-press context action) to bulk-mark all remaining triage items as shortlisted and advance to the Stack.

## UX Governance Compliance
- **Rule Alignment**: Progressive Disclosure — the action should not be front-and-center on every session, but discoverable when needed.
- **Static Interaction Pattern**: The button MUST NOT use heavy animation feedback (color scaling) on mobile.

## Proposed Test Case (TDD)
- [ ] E2E Test: `should shortlist all remaining items when 'Shortlist All' is tapped`
- [ ] E2E Test: `should proceed to Stack after Shortlist All with all items queued`

## Context / Constraints
- Component: `TriageView.svelte` / `TriageController`
- Must not conflict with individual swipe gestures.
