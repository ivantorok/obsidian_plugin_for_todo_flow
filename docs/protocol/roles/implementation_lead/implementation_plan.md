# Implementation Plan: Watcher Silencing for Triage-to-Stack Handoff

The "Empty Stack" regression on desktop is caused by a race condition where Obsidian's `metadataCache.on('changed')` event is processed *after* a memory-based handoff ("Direct Injection"), causing a redundant disk reload that reads stale or empty data.

## Proposed Changes

### [Core Logic]

#### [MODIFY] [StackPersistenceService.ts](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/src/services/StackPersistenceService.ts)
- Add a `silentMode: boolean` flag.
- Add `setSilent(silent: boolean): void` to toggle this flag.
- Update `isExternalUpdate(filePath: string): boolean` to return `false` if `silentMode` is `true`.

#### [MODIFY] [StackView.ts](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/src/views/StackView.ts)
- Update `setState(state: any, result: any)` to silence the persistence service during the handoff.
- Use a `finally` block to ensure unsilencing occurs even if state application fails.
- Add a small `setTimeout` delay (e.g., 500ms) before unsilencing to account for OS-level event buffering.

## Verification Plan

### Automated Tests
- **New Unit Test**: `src/__tests__/WatcherSilence.test.ts`
  - **Case 1**: Watcher triggers `refresh()` when NOT silent and diff > 2000ms.
  - **Case 2**: Watcher DOES NOT trigger `refresh()` when silent, even if diff > 2000ms.
  - **Case 3**: Watcher triggers `refresh()` after unsilencing delay.
- **Run command**: `npx vitest src/__tests__/WatcherSilence.test.ts`

### Manual Verification
1.  Open Todo Flow on Desktop.
2.  Navigate to a Stack View.
3.  Perform a Triage session for a Daily Stack.
4.  Shortlist at least 3 items and Finish Triage.
5.  **Verify**: The Stack View updates immediately with the 3 items and DOES NOT revert to an empty stack after a few seconds.
