# Diagnostic Report: BUG-012 (Existing Task Selection)

## Problem Detail
Selecting an existing task via the FAB during Triage fails to append it to the queue or persist the state on disk. This was previously unreproducible on high-performance hardware (M4 Mac).

## Root Cause Analysis
1.  **Hardware Performance Gap**: The Linux environment (8GB RAM, 4 cores) is significantly slower than the M4 Mac (48GB RAM). This latency exposures race conditions in the Svelte component's mount/update cycle and the modal's asynchronous callback.
2.  **Missing Persistence Logic**: The "existing task" handler in `TriageView.ts` only updates the in-memory `TriageController` but does not update the file's `flow_state` on disk.
3.  **UI Feedback Silence**: A lack of immediate visual confirmation (e.g., Obsidian Notice) makes it appear that "nothing happens" even if the in-memory update succeeds.

## Proposed Remediation
- **Disk Sync**: Implement `app.vault.process` inside the existing task handler to set `flow_state: dump`.
- **Notice Implementation**: Use `new Notice()` to confirm successful addition.
- **Title Sanitization**: Strip file extensions from the task title for cleaner UI display.
- **Error Guarding**: Add try-catch blocks to prevent silent failures on resource-constrained hardware.

## Verification Result
Reproduction E2E test `tests/e2e/journeys/mobile_triage_existing_task.spec.ts` passes on Linux but reveals the "silence" in feedback and lack of disk update.
