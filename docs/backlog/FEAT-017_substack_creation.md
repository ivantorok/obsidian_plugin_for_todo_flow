# FEAT-017: Subtask Creation & Detailed View Polish
**Capture Date**: `2026-03-10 11:25:00`

## Problem / Goal
After prototyping the Substack Hierarchy (FEAT-016), the user can now navigate into subtasks, but cannot yet *create* them directly from the UI. This forces a return to the Markdown editor, breaking the "Sovereign UI" flow.

## Expected Behavior
- **DetailedTaskView**: Add a "New Subtask" button (or '+' icon) to the header or action list.
- **Interaction**: Tapping '+' opens a `SovereignInput` dedicated to the subtask title.
- **Persistence**: On save, the new subtask is appended as a wikilink (e.g., `[[Subtask Name]]`) to the parent task's file body.
- **Rollup**: The UI should immediately reflect the updated subtask count and duration.

## Proposed Test Case (TDD)
- [ ] E2E Test: Open Detailed View -> Tap 'Add Subtask' -> Enter Title -> Verify indicator count updates.
- [ ] Unit Test: `GraphBuilder` should detect the new link and reload the hierarchy.

## Reuse & Architectural Alignment
- **Components**: `SovereignInput`, `ActionButton`.
- **Services**: `StackPersistenceService`, `LinkParser`.

## UX Governance Compliance
- **Rule Alignment**: **Sovereignty Buffer**, **No Jumping**.

## Context / Constraints
- Must handle file creation for the new subtask automatically (mirroring the root task creation logic).
