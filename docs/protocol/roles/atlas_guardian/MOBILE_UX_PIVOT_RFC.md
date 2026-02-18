# RFC: The "Stack-Triage" Hybrid (Mobile UX Evolution)

## 1. Problem Statement
The current "Lean Mobile" (Elias 1.0) model is extremely performant but feels functionally hollow. Conversely, the Desktop "Unified" model is mentally rich but technically "noisy" on mobile hardware due to DOM density and gesture ambiguity (Scroll vs. Drag).

## 2. Proposed Architecture: The "Focus/Architect" Split

We propose decoupling **Execution** (The Moment) from **Architecting** (The Schedule).

### Mode A: The Focus Card (Default Execution)
*   **Visual**: Single massive card (identical physics to `TriageView`).
*   **Performance**: 60fps guaranteed (Single-Item DOM).
*   **Actions**: 
    *   **Done**: Swipe Right.
    *   **Archive**: Swipe Left.
    *   **Next**: Swipe Down.
    *   **Undo**: Swipe Up.
*   **Drill-Down**: Tapping the card opens the "Architect Menu" for Anchoring, Duration Tuning, and Sub-stack entry.

### Mode B: The Architect List (Strategic View)
*   **Visual**: Simple vertical list of task titles (high density).
*   **Performance**: Low-cost rendering (no complex card components).
*   **Actions**:
    *   **Reorder**: Static drag-handles or "Move Up/Down" buttons to protect the Main Thread from fluid D&D jank.
    *   **Select**: Tapping a task title returns the view to **Mode A** with that task focused.
    *   **Add Flow**: Integrated unified "Triage-style" add button.

## 3. The "Physics" of the Pivot
1.  **Zero-Ambiguity Gestures**: By using a single card, we eliminate "Scroll vs. Swipe" conflicts.
2.  **Optimistic Sovereignty**: All actions update the local Svelte `$state` instantly, with disk sync happening in the background.
3.  **Functional Parity**: Bringing Anchoring and Duration back to mobile without the vertical layout tax.

## 4. Proposed Journey
1.  User starts mobile session -> **Focus Card**.
2.  User realizes the order is wrong -> Taps "List Icon" -> **Architect List**.
3.  User drags "Task B" above "Task A" -> Taps "Task B" -> Returned to **Focus Card** with Task B active.
4.  User finishes day -> **Victory Lap**.

---
**Status**: IDEATION / RFC
**Author**: Atlas Guardian (AG)
**Date**: 2026-02-18
