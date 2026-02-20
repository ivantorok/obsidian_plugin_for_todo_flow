# BUG-022: Quick Add Optimistic ID Race Condition

## Overview
When the user rapidly inputs a new task via the Quick Add modal (e.g., in Triage or Stack), the UI optimistically injects the task into the Svelte component using a generated ID (`temp-${Date.now()}`). Over the next few hundred milliseconds, the `onCreateTask` handler creates the `.md` file on disk and *should* swap the ID.

## Impact
If the user interacts with the new task (e.g., swipes to anchor, or quickly drills down) *before* the real ID replaces the temporary one, the `HistoryManager` and underlying `Command` constructors will attempt to act on `temp-1234567`. This results in silent failures, "File not found" errors, or state desynchronization.

## Reproduction Path (Theoretical)
1. Open Triage View.
2. Hit `c` to open Quick Add.
3. Type a task name and hit Enter.
4. *Immediately* (within ~50ms) swipe right on the newly inserted task item to send it to the shortlist.
5. The `TriageController` will attempt to update the `flow_state` metadata of the non-existent `temp-...` file path.

## Proposed Strategy
1. **Disabled UI State:** When a task is inserted into the UI with a `temp-` ID, it should be visually grayed out and CSS `pointer-events: none` should be applied until the ID resolves.
2. **Keybinding Lock:** The controller needs a mechanism to ignore key commands targeting temporary IDs.
3. **Queue Actions (Alternative):** Allow interactions, but push them into an "Optimistic Action Queue" that replays the commands once the real ID is confirmed. (This is significantly harder to implement and likely overkill compared to a 100ms UI lock).

## Priority
High. It breaks foundational data integrity during fast data entry.
