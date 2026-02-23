# Primitive: Read-Merge-Write

The protocol for ensuring data integrity when the UI state needs to be persisted to a potentially existing file.

## The Protocol
1. **Read**: Load the current content of the target file from the vault.
2. **Merge**: Combine new tasks/changes with existing content. 
    - Deduplicate by task ID/path.
    - Preserve existing metadata not handled by the plugin.
3. **Write**: Atomic write back to the vault.

## Protective Measures: Watcher Silencing
High-stakes operations (like `[[TRIAGE]]` -> `[[STACK]]` handoff) are protected by **Watcher Silencing**.
- **Action**: Disable file system observers (`StackPersistenceService.silence()`) during the write phase.
- **Reason**: Block race conditions where a partial write triggers a UI refresh before the atomic handover is complete.

## Protective Measures: Sync Feedback Protection
To prevent data loss when external sources (e.g., Obsidian Sync) update the vault:
- **Constraint**: Views MUST block local auto-saves if an external reload is pending or in progress.
- **Mechanism**: `isReloading` flag in `StackView`. If `true`, `triggerSave()` is aborted.
- **Debounce**: Use a longer debounce (e.g., 3s) during active sync windows to allow disk state to stabilize before refreshing the UI.

## Decision Phase (Conflict Resolution)
If a structural conflict is detected (e.g., merging two unrelated stacks), the system MUST trigger a **Decision Phase** presenting the user with:
- **Merge (Append)**: Priority on data retention.
- **Overwrite (Fresh)**: Clear the old state.

## Implementation References
- Initiated during the `[[TRIAGE]]` -> `[[STACK]]` handoff.
- Used by `StackPersistenceService` to prevent "File overwritten" data loss.
