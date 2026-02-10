# BUG-019: Triage Workflow Data Loss (Resolved v1.2.30)

## Problem / Goal
Tasks moved to "Shortlist" during Triage are **not appearing** in the Daily Stack if the "Daily Stack" (`CurrentStack.md`) already exists and contains items. The workflow assumes `CurrentStack.md` is the source of truth and ignores the just-triaged items, effectively "losing" them from the active view.

## Current Behavior
1.  User enters **Dump** mode and creates tasks (saved to `Dump.md` or individual files).
2.  User enters **Triage** mode.
3.  User swipes **Right** (Shortlist) on tasks. Flow State updates to `shortlist`.
4.  Triage completes.
5.  System calls `open-daily-stack`.
6.  `open-daily-stack` checks `CurrentStack.md`.
    -   **If empty**: It loads `QUERY:SHORTLIST` (Works).
    -   **If exists**: It loads `CurrentStack.md` **AS IS** (Fails to include new items).
7.  New shortlisted tasks are stranded in the vault, not visible in the Daily Stack.

## Expected Behavior
- When Triage completes, the system MUST:
    1.  Load the existing `CurrentStack.md` (if any).
    2.  **Append** the newly shortlisted tasks to it (deduplicating if necessary).
    3.  Save the updated `CurrentStack.md`.
    4.  Open the Daily Stack view showing ALL tasks.

## Steps to Reproduce
1.  Ensure `CurrentStack.md` exists and has at least one task.
2.  Create a new task in `Dump` (e.g., "Lost Task").
3.  Run `Start Triage`.
4.  Swipe Right on "Lost Task".
5.  Finish Triage.
6.  Observe that "Lost Task" is NOT in the Daily Stack.

## Proposed Test Case (TDD)
- [ ] **E2E Test**: `triage_workflow_continuity.spec.ts`
    - Setup: Create `CurrentStack.md` with "Old Task". Create "New Task" in Dump.
    - Action: Run Triage, shortlist "New Task".
    - Assertion: Verify `CurrentStack.md` contains BOTH "Old Task" and "New Task".

## Reuse & Architectural Alignment
- **Components**: `StackLoader` (to load existing), `StackPersistenceService` (to save merged).
- **Location**: Implementation should likely reside in `main.ts` -> `onComplete` callback for TriageView, or a dedicated `WorkflowService`.

## UX Governance Compliance
- **Data Integrity**: User input (Triage decisions) must never be discarded or hidden.
