# ADR: Post-Audit Corrections (2026-02-20)

## Context
A manual heuristic review of the application against our `JOURNEYS.md` revealed three architectural deviations threatening data integrity and mobile performance:

1.  ** Optimistic IDs:** `BUG-022`. Injecting `temp-` IDs before disk confirmation breaks the "Projection Principle" (Disk as Source of Truth).
2.  ** Sync Race Conditions:** `BUG-023`. Using a global, time-based debounce (2000ms) to guess if a file edit was external violates deterministic "Interaction Sovereignty."
3.  ** Mobile Component Bloat:** `FEAT-009`. `StackView.svelte` runs desktop-grade physics and DOM listeners on mobile, violating our `STRATEGY_LEAN_MOBILE.md` (Static over Fluid).

## Decisions

### Decision 1: UI Locking for Optimistic Operations (`BUG-022`)
We will not implement complex command-queuing for temporary IDs.
*   **Action:** When an optimistic task is created, the view MUST lock interaction (e.g., via CSS pointer-events or a boolean state flag) on that specific list item until the asynchronous `onCreateTask` resolves and injects the canonical file path ID.
*   **Rationale:** Simplicity. A 100ms lock is imperceptible to the user but prevents catastrophic state desyncs in the command bus.

### Decision 2: File-Scoped Interaction Tokens (`BUG-023`)
We will remove the global `silencedUntil` time heuristic in `StackPersistenceService.ts`.
*   **Action:** Persistence locking must become file-specific `Map<string, boolean>`. If we initiate a write to `CurrentStack.md`, we lock *that file*.
*   **Action:** Instead of time, we must read the metadata. If an Obsidian `on('change')` event fires for a locked file, we compare the incoming `[x]` statuses against our in-memory `TaskNode[]`. If they match our intent, we ignore the event. If they differ (Obsidian Sync brought a new state), we refresh.
*   **Rationale:** Determinism over guessing.

### Decision 3: The Lean Mobile Component Split (`FEAT-009`)
We will decouple rendering logic.
*   **Action:** Create `ArchitectStack.svelte` (Desktop, Fluid) and `FocusStack.svelte` (Mobile, Static).
*   **Action:** Svelte's strict `$effect` reactivity requires that unused listeners be physically unmounted, not just hidden via CSS `display: none`. The orchestrator must dynamically import/mount the correct component based on `isMobile`.
*   **Rationale:** True essentialism. Mobile devices must not pay the CPU/Battery tax for desktop drag-and-drop physics.

## Consequences
- Requires a significant UX update to `QuickAddModal` transitions.
- The state reconciliation logic in `StackView.ts` will become more complex but vastly more resilient to Obsidian Sync.
- A painful but necessary severing of `StackView.svelte` into two discrete files, increasing boilerplate but ensuring strict performance bounds.
