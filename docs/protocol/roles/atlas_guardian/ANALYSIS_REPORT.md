# Atlas Guardian: Analysis Report

**Context**: Empty Stack after Triage (Ghost in the Machine)

## Structural Analysis
The current `[[TRIAGE]]` -> `[[STACK]]` transition is **disk-mediated**.
-   `TriageView` -> `saveStack` (Disk) -> `open-daily-stack` (Command) -> `loadStackIds` (Disk) -> `activateStack`.
-   This pattern is vulnerable to **Obsidians Metadata Cache latency**. If the stack view reloads from disk before the vault indexing is complete, it reads an old/empty version of the stack file.

## Behavioral Drift
The `StackView` performs an unconditional `reload()` on `onMount`. This violates **Interaction Sovereignty** because it prioritizes a potentially stale disk state over the verified memory state (the shortlisted tasks) that was just explicitly passed by the user.

## The Fix: "Direct Injection"
We must move to an **Atomic Memory Handoff**.
1.  **main.ts**: Pass the known task IDs directly from triage results to the new stack view state.
2.  **StackView**: Skip the initial disk reload if explicit tasks were provided during initialization.

## Impact on Atlas
-   Update `[[TRIAGE]]` transition notes to prefer Direct Injection for intra-session handoffs.
-   Added **Story 11 ("Ghost in the Machine")** to [USER_STORIES.md](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/USER_STORIES.md).
