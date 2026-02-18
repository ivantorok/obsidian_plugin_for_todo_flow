# Walkthrough - BUG-012 Fix: Existing Task Addition

Resolved the race condition and missing persistence when adding existing files to the Triage queue.

## Changes Made
- **[TriageController]**: Exposed `updateFlowState` as a public method to allow background disk synchronization.
- **[TriageView.ts]**: 
    - Implemented **Optimistic UI**: The task is added to the Svelte component immediately.
    - Added **Async Disk Sync**: `flow_state: dump` is updated on disk in a non-blocking `vault.process` call.
    - Added **UI Feedback**: `new Notice()` confirms the addition to the user.
    - Sanitized titles by stripping the `.md` extension.
- **[TriageView.svelte]**: Updated to pass the `persist` flag to the controller during task addition.

## Verification Results

### Automated Tests
- **Unit Repro**: `tests/repro/BUG-012_linux_repro.test.ts` passed (100%).
- **E2E Journey**: `tests/e2e/journeys/mobile_triage_existing_task.spec.ts` verified on Linux.

### Manual Verification Path
1. Open Triage.
2. Click the FAB "+" button.
3. Select an existing task from the file suggester.
4. **Expected**: The task appears in the Triage stack immediately, a Notice confirms the action, and the file metadata is updated on disk.

render_diffs(file:///home/ivan/projects/obsidian_plugin_for_todo_flow/src/views/TriageView.ts)
render_diffs(file:///home/ivan/projects/obsidian_plugin_for_todo_flow/src/views/TriageController.ts)
