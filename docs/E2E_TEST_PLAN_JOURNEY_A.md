# E2E Test Plan - Journey A: Dump & Triage

## Goal
Implement end-to-end test for "Journey A": The full flow from capturing tasks in Dump to triaging them into the Daily Stack.

## Steps
1.  **Setup**: Clean vault, reload Obsidian.
2.  **Start Dump**: Execute `todo-flow:open-todo-dump`.
3.  **Interact**:
    -   Type "Task 1" -> Enter.
    -   Type "Task 2" -> Enter.
    -   Type "Task 3" -> Enter.
    -   Type "done" -> Enter.
4.  **Verify Triage Open**: Check for `TriageView` and ensure tasks are loaded.
5.  **Triage Actions**:
    -   Task 1: **Keep** (Swipe Right / or 'l' key).
    -   Task 2: **Archive** (Swipe Left / or 'h' key).
    -   Task 3: **Keep**.
6.  **Verify Stack**:
    -   Check Stack View for presence of Task 1 and Task 3.
    -   Verify Task 2 is absent (archived).

## Code Structure (Proposed)
`tests/e2e/journey_a.spec.ts`
```typescript
describe('Journey A: Dump & Triage', () => {
    // ... test implementation
});
```
