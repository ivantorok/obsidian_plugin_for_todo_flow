# BUG-023: Sync Window Race Condition (`StackPersistenceService`)
**Capture Date**: `2026-02-20 10:35:23`

## Overview
The plugin relies on `StackPersistenceService.ts` to differentiate between edits made by *our* plugin and external edits (like Obsidian Sync pulling a change from another device). Currently, this is handled by `isExternalUpdate(filePath)`, which checks if a file changed more than 2000ms after our last known internal write `lastInternalWriteTime`. It also utilizes a global `silencedUntil` flag.

## Impact
1.  **False Negative (Ignored Sync):** If an external sync occurs exactly at 1500ms after we made a local edit, `isExternalUpdate` considers it an internal echo and ignores it. The UI doesn't refresh, causing data desync.
2.  **False Positive (UI Hijack):** If a local disk I/O echo happens at 2100ms, it is flagged as external, forcing a full GUI reload. If the user is mid-drag, this rips focus away and abandons their interaction sequence.
3.  **Global Silence Flaw:** `silencedUntil` applies globally. If the user is dragging a task in `CurrentStack.md`, we block *all* external change detections, even if Obsidian Sync updates a completely independent backlog file that we *should* be listening to.

## Proposed Strategy
1.  **File-Specific Silence:** Transition from a single `silencedUntil` epoch to a `Map<string, number>` tracking silences per file path.
2.  **Interaction Tokens:** Instead of debouncing time (2000ms), we should inject an `X-Modifier: todo-flow` flag into Obsidian frontmatter or rely on atomic memory locking. If a file `on('change')` fires, we read the exact metadata state to see if the semantic change originated locally, rather than guessing based on time deltas.

## Priority
High. This is a foundational data-loss vector in multi-device setups.
