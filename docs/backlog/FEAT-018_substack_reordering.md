---
id: FEAT-018
title: Subtask Reordering & Hierarchy Manipulation
status: draft
priority: high
flavor: feat
---

# FEAT-018: Subtask Reordering

## Objective
Implement reordering of subtasks within a parent task's markdown file. When a user drags and drops a subtask in the Architect Stack (or Reorder Mode), the underlying wikilinks in the parent file must be updated to reflect the new chronological order, ensuring the `GraphBuilder` and Timeline logic remain consistent.

## Problem Statement
Currently, we can create subtasks (FEAT-017) and navigate the hierarchy (FEAT-016). However, the "Substack CRUD" loop is incomplete. Reordering a subtask in the UI updates the logical sorting array temporarily, but does not commit the new order to the parent markdown file. 

From the Master Plan:
> Reorder Mode: Vertical swipes act as invisible drag-and-drop handles for the selected task.
> TaskService: Rewrites the link order in the stack.md file.

## Requirements
1. **Detect Substack Context**: The drag-and-drop handler (`StackController` / `HandoffOrchestrator`) must know if the current view is a daily stack (e.g., `20260311...`) or a parent task (Substack).
2. **File Mutation**: When a reorder event occurs (`MOVE_TASK`), the `TaskService`/`StackPersistenceService` must rewrite the wikilinks in the parent file in the exact order specified by the UI's new array.
3. **Graph Synchronization**: Ensure the `StackSyncManager` and `InteractionIdleQueue` properly debounce this file mutation without thrashing the disk or causing UI jank (Sovereign Bridge rules apply).
4. **Desktop vs. Mobile Parity**: SortableJS handles Desktop drag-and-drop; Mobile uses the `isReorderMode` gesture logic. Both must route to the same `onReorder` persistence trigger.

## Verification
- E2E Spec: Write `substack_reordering.spec.ts` to assert that dragging a child task visually updates the order, and that a full Obsidian reload confirms the order was persisted to the parent `.md` file.
