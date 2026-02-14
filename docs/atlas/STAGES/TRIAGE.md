# Stage: Triage

A decision-weighted staging area for processing the latest items.

## Characteristics
- **Binary Choice**: Items are either "Shortlisted" for the stack or "Archived/Skipped".
- **Interaction Pattern**: Static buttons (Lean) or High-Speed Gestures (Full).
- **Mechanics Applied**:
    - `[[FOCUS_HANDSHAKE]]`: Captures `j`/`k` for triage navigation.

## Transitions
- **Handoff to Stack**: Triggers the `[[READ_MERGE_WRITE]]` protocol if a stack already exists.
- **Decision Phase**: If a conflict occurs, the user must choose between Merge or Overwrite.

## Entry Points
- **Standard**: `[[DUMP]]` -> `[[TRIAGE]]` transition.
- **Folder**: `Triage Folder` command (Desktop).
    - Processes all markdown files in a selected directory via `GraphBuilder`.
    - MUST follow `[[UI_FEEDBACK]]` (e.g., "Processing folder...") to avoid "Silent Processing" perception.
