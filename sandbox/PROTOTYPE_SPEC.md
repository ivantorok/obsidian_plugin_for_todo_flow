# UI Prototyping Workbench

This sandbox is used for rapidly iterating on UI concepts in isolation ("mobile jail").

## Current Prototyping Paradigm (The Two-View Split)

We are currently prototyping two distinct, isolated HTML views to test specific interaction rules before integrating them.

### 1. The Stack View (`architect.html`, `focus.html`, `index.html`)
- **Visuals**: Tasks are represented as horizontal rows/lines.
- **Interactions**: Heavy gesture reliance.
  - Swipe Left: Archive
  - Swipe Right: Complete
  - Scroll & Single Tap: Selection
  - Long Press (Tap & Hold): Opens a Context Menu overlaid directly on the task (prototyped as `TaskContextMenu`). This menu provides localized controls:
    - **Reorder Mode**: Toggles draggability (solves the scrolling vs dragging conflict).
    - **Duration Scaling**: Rapidly adjusts the task duration using a logarithmic-like sequence.
    - **Open Details**: Alternative way to enter the Detailed View.
    - **Anchor Time**: Toggles time anchoring.
  - Double Tap: Undo.

### 2. The Detailed Task View (`detailed.html`)
- **Visuals**: A completely separate, full-screen view (or viewport-aware modal) showing the deep content and controls for a single task.
- **Interactions**: No gestures allowed. Strictly taps on buttons and keyboard input.

## Prototyping Roadmap
*Centralized checklist for upcoming UI prototypes and Interaction Contracts.*

- [x] **Detailed Task View**: Full-detail task inspector. Strict tap/keyboard input (no gestures). *Promoted to `src/views/DetailedTaskView.svelte` with Viewport-Aware logic.*
- [x] **Stack View Structure**: Header (displaying current stack deep-link/position) and Footer (add task / export). *Promoted to `src/views/StackViewStructure.svelte` with Vanilla Interaction Contract.*
- [x] **Dump & Triage Refinement**: Revisit existing models and formalize/codify their designs into Interaction Contracts. *Verified via High-Fidelity Shadow Audit Workbench (v1.2.125).*

## The Sandbox Lifecycle (Max Two Versions)
To prevent sandbox clutter and confusion, the `sandbox/` directory strictly enforces the **Max Two Versions** rule for any given UI component:

1.  **[Prod]**: A prototype that imports the live component directly from `src/views/` (e.g., `DumpViewHardShell.svelte`).
2.  **[Future]**: An isolated, local prototype component representing the next iteration (e.g., `DetailedTaskView.svelte`).

**The Cycle:**
Once a **[Future]** prototype is approved and promoted to `src/views/`, the old **[Prod]** representation is deleted, the new Future becomes the current Prod, and the cycle resets. 
*Graveyard files and outdated "Shadow" snapshots are strictly forbidden.*
