# Manual Testing Audit: 2026-02-20

## Context & Goal
Strategic review of the current implementation against our defined `JOURNEYS.md` and user personas (Lillian & Elias). 
The goal is to explicitly identify core invariants to **protect** and friction points to **change**.

---

## 1. Journey: The Desktop "Lillian" Triage
*(Reference: `docs/reference/JOURNEYS.md` - Section 1)*

### 🛡️ Core Mechanics to Protect (Working well)
*   **Centralized Sovereignty (`TriageView.ts`, `StackView.ts`):** The global keydown interception mapping is robust and prevents Obsidian hotkey bleeding.
*   **Keyboard Navigation & optimistic feedback:** `TriageController.ts` handles rapid sorting (`swipeRight`, `swipeLeft`) well in memory before syncing.

### 🚧 Friction Points & Proposed Changes
*   **Observation:** Quick Add Optimistic ID mapping is fragile.
*   **Systems Impact:** In `TriageView.ts` and `StackView.ts`, when creating a new task, a `temp-${Date.now()}` ID is pushed to Svelte. If the user rapidly acts on this task before `onCreateTask` resolves and replaces the ID, subsequent operations might fail or throw "File not found".
*   **Strategic adjustment:** We should disable interactions on "pending" tasks or ensure `onCreateTask` blocks the UI briefly, or queue actions against the temporary ID.

---

## 2. Journey: The Mobile "Elias" Execution
*(Reference: `docs/reference/JOURNEYS.md` - Section 2)*

### 🛡️ Core Mechanics to Protect
*   **Gesture Locks:** `StackView.svelte` implements `lockPersistence` during touch events, successfully freezing physics and disk I/O to protect the main thread during interactions.
*   **Intent Locking:** The separation of Drag vs Swipe intent in `handlePointerMove` prevents accidental reorders when trying to complete tasks.

### 🚧 Friction Points & Proposed Changes
*   **Observation:** The "Lean Mobile" (Elias) strategy prescribes "Zero-Logic Rendering" and a separate component approach, but currently `StackView.svelte` is a 2,200+ line monolith handling both Desktop "Architect" and Mobile "Focus" modes.
*   **Systems Impact:** All reactive loops (`$effect`, `tick`) run regardless of the device. This increases battery drain and thermal throttling on lower-end mobile devices, violating the Elias 1.0 constraint of 100% responsiveness on weak hardware.
*   **Strategic adjustment:** We should split `StackView.svelte` into `ArchitectStack.svelte` and `FocusStack.svelte`, orchestrating them via the main view, completely shedding the drag/drop and keyboard heavy logic on mobile.

---

## 3. Systemic / Persistence Observations
*(For things happening beneath the user journeys, like file syncing, background watchers, or error recovery)*

### 🛡️ Core Mechanics to Protect
*   **Debounced Disk Writes:** By deferring `saveStack` via a debounce in `StackView.svelte`, we prevent Obsidian from stuttering during rapid list interactions (like swiping multiple tasks).
*   **Sovereign Silence:** `StackPersistenceService.ts` correctly blocks external updates during critical handoffs to prevent state tearing.

### 🚧 Friction Points & Proposed Changes
*   **Observation:** The `isExternalUpdate` logic relies on a hardcoded 2000ms window and a global `silencedUntil` flag.
*   **Systems Impact:** If Obsidian Sync pulls down a change for a task file right after the 2000ms window (but while the user is actively engaged in a long drag interaction), we might trigger a reload that yanks focus. Additionally, a global silence ignores *all* external files, even ones we aren't currently editing.
*   **Strategic adjustment:** We should transition the persistence service to lock/unlock via an explicit "interaction token" or tie the silence directly to specific file paths rather than a global clock, reducing race conditions with Obsidian Sync.
