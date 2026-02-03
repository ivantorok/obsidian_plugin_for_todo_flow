# BUG-007: Sync: External file edits (startTime) not refreshing in Stack View

## Problem / Goal
When a user edits a task file directly (e.g., changing the `startTime` in frontmatter), the Daily Stack view does not automatically update to reflect the change.

## Current Behavior
The user notes that after editing a file, the starting time did not update in the stack until a manual reload was triggered from the command palette.

## Expected Behavior
The `StackView` should react to vault `modify` events and refresh the displayed metadata (especially start times and labels) automatically without a full manual reload.

## Steps to Reproduce (for Bugs)
1. Open Todo Flow Stack View.
2. Note the start time of a task.
3. Open the underlying markdown file for that task.
4. Manually change the `startTime` in the YAML frontmatter and save.
5. Return to Stack View; observe that the time has not changed.

## Proposed Test Case (TDD)
- [ ] E2E Test: Modify a task file's frontmatter via `app.vault.process` and verify the UI updates.

## Context / Constraints
- `main.ts` already has a watcher for `CurrentStack.md`, but it might need a more general watcher for any task in the current stack.
- Performance considerations for watching many files.
