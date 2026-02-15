# Routing Request: Implementation Lead (IL)

**Origin**: Process Governor (PG)
**Date**: 2026-02-15 11:20
**Context**: Triage Empty Stack Regression (Direct Injection Race)

## Request Details
The Atlas Guardian (AG) and Diagnostic Engineer (DE) have confirmed that the "Empty Stack" regression on desktop is caused by a race condition between the **Direct Injection** memory handoff and the **NavigationManager** disk watcher.

### Mission
Implement the "Watcher Silencing" protocol to ensure memory state sovereignty during the Triage -> Stack transition.

### Implementation Focus
1.  **Sovereign Handoff**: Silencing the `NavigationManager` file watcher temporarily during the `activateStack` call.
2.  **Persistence Lock**: Ensure `CurrentStack.md` is updated but does not trigger a reload in the active view until the memory handoff is verified.
3.  **Regression Testing**: Extend `handoff_regression.test.ts` to simulate high-latency disk events (Obsidian metadata delay).

### References
- **Diagnostic Report**: [DIAGNOSTIC_REPORT.md](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/protocol/roles/diagnostic_engineer/DIAGNOSTIC_REPORT.md)
- **Protocol Audit**: [ANALYSIS_REPORT.md](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/protocol/roles/atlas_guardian/ANALYSIS_REPORT.md)
- **Mission Log**: [MISSION_LOG.md](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/protocol/roles/common/MISSION_LOG.md)

## Expected Response
- **Implementation Plan (IP)** covering the watcher silencing logic.
- PR/Commit with passing regression tests.
