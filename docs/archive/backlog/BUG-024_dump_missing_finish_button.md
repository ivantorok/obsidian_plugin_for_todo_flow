# BUG-024: Dump View — Missing "Finish" Button
**Capture Date**: `2026-02-22 08:49`

## Problem / Goal
The Dump view has no explicit "Finish" / "Done reviewing" action. Users have no clear affordance to signal they are done reviewing the dump and ready to proceed to Triage.

## Current Behavior
No finish/complete CTA visible in the Dump view. The transition to Triage requires navigating away or via another mechanism not immediately obvious.

## Expected Behavior
A clearly visible "Finish" button (or equivalent primary CTA) is present on the Dump view to advance the workflow to the Triage stage.

## UX Governance Compliance
- **Rule Alignment**: Atomic Handoff Synchronization — the departing view MUST signal readiness explicitly before the arriving view mounts.
- **Content Containment**: CTA must be within safe-area bounds on mobile.

## Proposed Test Case (TDD)
- [ ] E2E Test: `should show Finish button in Dump view and navigate to Triage on tap`

## Context / Constraints
- Component: `DumpView.svelte` / `DumpController`
- Mobile-first: button must meet 44x44px touch target.
