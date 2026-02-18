# IMPLEMENTATION PLAN: Mobile Hybrid Model

## Phase 0: Restoration & Unification [CRITICAL]
Before the architectural pivot, we must stabilize the foundation to resolve existing logic drift.

### 1. The Rollup Fix
- **Target**: [scheduler.ts](file:///Users/i525277/github/obsidian_plugin_for_todo_flow/src/scheduler.ts)
- **Action**: Refactor `getMinDurationWithAudit` to sum reachable nodes using `originalDuration` only. Prevent double-counting by ignoring any pre-calculated `duration` (rollup) fields in the registry during traversal.

### 2. The View Unification
- **Target**: [main.ts](file:///Users/i525277/github/obsidian_plugin_for_todo_flow/src/main.ts), [ViewManager.ts](file:///Users/i525277/github/obsidian_plugin_for_todo_flow/src/ViewManager.ts), [StackView.ts](file:///Users/i525277/github/obsidian_plugin_for_todo_flow/src/views/StackView.ts)
- **Action**: Deprecate `LeanStackView`. Use `StackView` as the universal class for both Mobile and Desktop. This ensures `ViewManager` correctly identifies active leaves and triggers reloads across all platforms.

### 3. The Logic Harmonization
- **Target**: [StackView.svelte](file:///Users/i525277/github/obsidian_plugin_for_todo_flow/src/views/StackView.svelte)
- **Action**: Integrate "Mode" switching into the primary Svelte component. Mobile will default to `Focus (Card)` mode but will use the same `StackController`, `NavigationManager`, and `HistoryManager` as the desktop view.

### 4. The "Parked" Purge
- **Target**: All Svelte components.
- **Action**: Delete all `parked` status UI elements, buttons, and CSS selectors to align with [TASK_STATUS_ENFORCEMENT.md](file:///Users/i525277/github/obsidian_plugin_for_todo_flow/docs/atlas/MECHANICS/TASK_STATUS_ENFORCEMENT.md).

---

## Phase 1: Hybrid Build (Round 4)
This phase implements the architectural pivot from "Lean/Elias" to the **Hybrid Focus/Architect** model.

## User Review Required

> [!IMPORTANT]
> This change replaces the existing `LeanStackView` with a new `HybridStackView` implementation based on the unified `StackView`.
> - **Interaction Pause**: Disk writes will be delayed by 300ms during active touch interactions.
> - **Sync Sentry**: A new UI indicator will appear when Obsidian Sync is actively transferring files.
> - **Navigation Pivot**: Tapping a task title now enters its child list (if any) instead of immediately opening its note. Use the **Pencil Icon** for note editing.

## Proposed Changes

### [Component] Mobile View Engine

#### [MODIFY] [StackView.svelte](file:///Users/i525277/github/obsidian_plugin_for_todo_flow/src/views/StackView.svelte)
*   **Mode Toggle**: Implement `$state` for `viewMode` (Focus vs Architect).
*   **Sync Sentry**: Implement internal plugin peeking to drive the "☁️ Syncing" indicator.
*   **Idle Queue**: Wrap all `vault.process` calls in a debounced queue triggered by interaction-idle events.

### [Component] Navigation & State

#### [MODIFY] [ViewManager.ts](file:///Users/i525277/github/obsidian_plugin_for_todo_flow/src/ViewManager.ts)
*   **Breadcrumb Logic (Experimental)**: Implement hierarchical tracking for the focus stack as an optional UI element.
*   **Native Handoff**: Register workspace history entries for each drill-down to support the native "Back" gesture.

## Verification Plan

### Automated Tests
*   **E2E Navigation**: Verify that `Back` from a Focus Card returns to the correct Parent List level.
*   **Sync Simulation**: Mock the internal Sync plugin's state to ensure the UI correctly disables actions.
*   **Rollup Validation**: Verify that nested task sums are correct and do not double-count.

### Manual Verification
*   Verify 60fps responsiveness during rapid swiping (ensuring the Idle Queue pauses disk I/O).
