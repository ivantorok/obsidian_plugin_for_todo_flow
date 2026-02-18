# Round 4: Final Technical Blueprint

This document represents the finalized technical specification for the Todo Flow Mobile Hybrid model. It serves as the primary "Source of Truth" for the Implementation Phase.

## 1. Architectural Core: The Hybrid View
The mobile experience is a single view that toggles between two high-performance modes:
*   **Focus Mode (Card)**: A single-task execution environment. Optimized for interaction (Swiping, Tapping). Minimal DOM density for 60fps performance.
*   **Architect Mode (List)**: A hierarchical planning environment. Optimized for organization (Reordering, Drifting).

## 2. Navigation Cadence (The Symmetry Rule)
Navigation follows a perfectly reflexive level-by-level path:
*   **Drill-Down**: Root List -> Focus Card [A] -> Child List [A.1, A.2] -> Focus Card [A.1].
*   **Drill-Up**: Focus Card [A.1] -> Child List [A.1, A.2] -> Focus Card [A] -> Root List.
*   **Affordances**:
    - **Physical Back**: (Android/iOS) Integrated with Obsidian's history to pop the view stack.
    - **Visual Breadcrumbs (Experimental)**: Optional breadcrumb trail for multi-level leaps. Candidate for removal if clutter is detected.

## 3. Sync & Integrity (Stateless Sentry)
The plugin maintains **Zero Internal State**. It is a reactive projection of the Vault's Markdown files.
*   **Sync Sentry**: Monitors `app.internalPlugins.getPluginById('sync')`.
    - Shows "☁️ Syncing" indicator when file system content is in transit.
    - Disables state-mutating actions (Done/Archive) if the vault is currently "Out of Sync" or "Uploading."
*   **Interaction-Idle Queueing**: To guarantee input responsiveness, disk-writes are queued. They execute ONLY when the user is not touching the screen for >300ms.

## 4. Interaction Physics
*   **Swipe Right**: Set status to `done`. Trigger **[[OPTIMISTIC_SOVEREIGNTY]]** (immediate visual success).
*   **Swipe Left**: Archive (move out of stack). Does NOT change task status in source.
*   **Tap Task (Focus)**: Transitions to that task's Architect Mode (if children exist) or opens the **Escape Valve**.
*   **Escape Valve**: Opens the actual Markdown file in the Obsidian Editor. Restores Todo Flow view via the native Back gesture.

## 5. UI Guardrails
*   **Status**: Strictly binary (`todo` / `done`). `parked` is removed.
*   **Rollup**: Displays the single aggregated duration sum only.
*   **Tap Targets**: Minimum 44x44px for all controls.

---
**Status**: ROUND 4 - FINAL SPECIFICATION
**Role**: Atlas Guardian (AG)
