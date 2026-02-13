# FEAT-005: Immersion Capture (Triage-Style)

## Problem / Goal
Mobile capture currently appends to a side-file (`Mobile_Inbox.md`), which requires a separate Triage step later. Users want to add ideas directly to their current stack with full context.

## Expected Behavior
1.  Clicking the FAB expands into a full-list "Immersion" overlay.
2.  The overlay shows the current stack items for context.
3.  New tasks are entered and appended directly to the end of the active `.md` file.
4.  Focus is immediately returned to the stack after capture.

## Proposed Test Case (TDD)
- [ ] Unit Test: `onAppendStack` should perform an immediate disk write to the current stack file.
- [ ] E2E Test: Should show the list context and append the new task to the stack, then verify it appears in the loop.

## Reuse & Architectural Alignment
- **Utilities to Reuse**: `TriageController` (logic reuse), `StackPersistenceService`.
- **Architectural Patterns**: Handshake Pattern (Focus management).

## UX Governance Compliance
- **Rule Alignment**: Viewport Shifting (VKLS) must be handled by `ViewportService` for the input.

## Context / Constraints
- Must handle keyboard avoidance (bottom padding/buffer).
