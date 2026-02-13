# Strategy: Lean Mobile (The "Elias" Model)

This document outlines a strategic "Lite" version of the Todo Flow plugin designed for low-end hardware, high-stress environments, and minimal cognitive load.

## 1. Core Principles
*   **Essentialism**: Mobile is for *execution*, not *architecting*.
*   **Static over Fluid**: Prioritize button-based "Standard Interaction Patterns" over resource-intensive "Fluid Gestures."
*   **Zero-Logic Rendering**: Use Static HTML projections where possible to keep the Main Thread free for input responsiveness.
*   **Background Durability**: Queue non-essential logic (NLP, sorting) for the Desktop or background sync.

---

## 2. Implementation Levels

### Level 1: The Executioner (Elias 1.0)
The absolute minimum functional set for high-speed task closing.

*   **View Type**: Single Card Mode (One task at a time).
*   **Actions**:
    *   **Done**: Mark current file as `done`.
    *   **Next**: Pull the next file from the pre-calculated queue.
*   **Interaction Pattern**: **Explicit Intent**. Disable fluid gestures like reorder-on-drag or swipe-to-archive by default. Use static buttons or a dedicated "Reorder Mode" to protect the Main Thread.
*   **Technical Guardrail**: **Freeze-on-Interaction**. Pause the "Rock & Water" physics engine recalculations while any touch movement is active. Recalculate only on idle.
*   **Constraint**: No reordering, no renaming, no scheduling logic.
*   **Target**: 100% responsiveness on $100 Android devices.

### Level 2: The Adaptive Field Lead (Elias 2.0)
Adds "Improvisation" capabilities without significantly increasing hardware load.

#### A. The Side-Channel (Capture)
*   **Feature**: Global FAB (Floating Action Button) for rapid thought capture.
*   **Mechanism**: A text-only input that appends raw lines to `Mobile_Inbox.md`.
*   **Benefit**: Zero processing. No tags, no links, just a "one-way valve" for data safety.

#### B. The Parking Lot (Blockers)
*   **Feature**: "PARK" action next to "DONE."
*   **Mechanism**: Changes `flow_state` to `parked`. 
*   **Benefit**: Allows the user to move on without lying to the system. The record of the blocker is saved for Desktop review.

#### C. The Red Shadow (Awareness)
*   **Feature**: Visual collision indicator.
*   **Mechanism**: Simple comparison of `CurrentTime` vs. `NextAnchoredEvent`.
*   **Benefit**: Surfaces impending schedule conflicts without attempting to solve them on a tiny screen.

---

## 3. Potential Folder & File Structure

For an implementation of this "Lean" mode, we would likely introduce a separate view component or a conditional rendering branch:

*   **`src/views/LeanStackView.svelte`**: A simplified, static-first version of the Stack View.
*   **`src/services/CaptureService.ts`**: A ultra-lightweight service for the "Side-Channel" appends.
*   **`docs/backlog/LEAN-MOBILE-PHASE-1.md`**: Formal spec for the Level 1 implementation.
*   **`Mobile_Inbox.md`**: The target file for raw capture (user-facing).

---

## 4. The Exit Strategy
The Lean Mobile mode is a **funnel**. It ensures that high-quality data reaches the user's Desktop, where the "Full Version" of the plugin is used to handle the heavy mental and technical lifting.
