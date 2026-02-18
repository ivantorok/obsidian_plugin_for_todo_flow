# Mechanic: Unified Add Flow

Task creation is a sacred portal in Todo Flow. To maintain the **Input Neutrality** axiom, the "Add" experience must be identical whether triggered from Triage, Stack, or Mobile Focus.

## The Principle
1. **Context-Aware Defaults**: The Add Flow "senses" the current context. If I am in a sub-stack of "Home Renovations," the new task defaults to being a child of that stack.
2. **Modal Dominance**: The flow uses the `QuickAddModal`. It captures all keyboard/gesture handshakes until the task is created or the flow is cancelled.
3. **Optimistic Presence**: Upon submission, the new task MUST appear in the local view immediately. The background disk write is secondary to the "Visual Success" of the creation.

## The Handshake (Standard Ritual)
1. **Trigger**: `CREATE_TASK` action (Keyboard: `c` or Floating Action Button).
2. **Execution**: `ViewManager.openQuickAdd(context)`.
3. **Commit**: The task is appended to the current `tasks` state and the `PersistenceLayer` is notified.
4. **Refocus**: The view container is automatically refocused to maintain workflow continuity.

## Technical Reference
- `QuickAddModal.ts` in `src/ui/`
- `FEAT-001: Mobile Quick Add`
