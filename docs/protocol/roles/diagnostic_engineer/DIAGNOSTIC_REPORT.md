# Diagnostic Report: Empty Stack Regression (Desktop)

**Date**: 2026-02-15
**Engineer**: Diagnostic Engineer (DE)

## Summary
The "Empty Stack" bug is a race condition between the **Direct Injection** memory handoff and the **NavigationManager File Watcher**. Despite the fix in Story 11, the watcher remains active during the handoff and can trigger a redundant (and failing) disk refresh.

## Reproduction Steps (Inferred from Trace)
1. Open the Todo Flow plugin on Desktop.
2. Ensure a **Stack View** is already open (pinned or in a background leaf).
3. Start a **Triage Session** (via Dump or Triage command).
4. Finish Triage with several tasks in the shortlist.
5. `main.ts` executes `activateTriage` callback:
    - Writes the shortlist to `CurrentStack.md`.
    - Updates the internal write timestamp.
6. **Race Condition Starts**:
    - **Path A**: `main.ts` calls `activateStack`, which updates the existing Stack View's state via Direct Injection (IDs). `StackView.setState` loads tasks into memory.
    - **Path B**: Obsidian detects the write to `CurrentStack.md` and emits a `changed` event.
7. **The Failure**:
    - The existing `NavigationManager` (attached to the background Stack View) receives the `changed` event.
    - It calls `isExternalUpdate("CurrentStack.md")`.
    - If the event is delayed > 2s (common on Desktop during heavy I/O or sync), `isExternalUpdate` returns `true`.
    - `NavigationManager.refresh()` is triggered.
    - `refresh()` calls `loader.load("CurrentStack.md")`.
    - `LinkParser` reads the file from the adapter. If the write is buffered or the metadata cache is stale, it reads **0 tasks**.
    - The memory state is overwritten with an empty stack.

## Evidence
- `main.ts` (Line 638): `saveStack` followed by `activateStack`.
- `NavigationManager.ts` (Line 63): Watcher is always active and calls `refresh()` on external changes.
- `StackPersistenceService.ts` (Line 68): 2-second threshold for `isExternalUpdate` is a heuristic that fails under Desktop latency.

## Proposed Strategy for Atlas Guardian (AG)
The "Direct Injection" pattern is being undercut by the "State Sovereignty" of the disk watcher. We need to:
1. **Temporarily Disable Watcher**: Silence the `NavigationManager` watcher during the handoff phase.
2. **Protocol Alignment**: Ensure `CurrentStack.md` is only a *backup* for the memory state, not the primary source of truth during transitions.
