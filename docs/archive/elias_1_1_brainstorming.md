# Elias 1.1 Specification - Focus & Momentum

This document outlines the authoritative design for the next evolution of the Lean Mobile experience.

## 1. The Perpetual Loop (Infinite Stack)
*   **Circular Navigation**: The `NEXT` button on the final task wraps around to the first incomplete task.
*   **The "Victory Lap" Card**: Insert a special "Stack Overview" card at the end of each loop.
    *   **Visual**: A "Bird's Eye View" of the entire stack file, showing all tasks and their current states (Done, Todo, Parked).
    *   **Interaction**: Direct buttons to "Restart Loop" or "Close Session."

## 2. Immersion Capture (Triage-Style)
*   **Contextual Overlay**: The Capture FAB expands into a full-list overlay mirroring the `TriageView` logic.
*   **Primary Flow Append**: New tasks are typed directly into the stack and appended to the end of the current `.md` file immediately. No intermediate "Inbox" file.
*   **Intentional Focus**: Allows adding multiple items while maintaining awareness of the existing stack load.

## 3. The "Horizon" Guardian
*   **Persistent Awareness**: A non-obtrusive bar at the top/bottom showing the **next** upcoming anchored task and its countdown.
*   **Horizon Focus**: Even if the current task is anchored, the Guardian displays the *following* hard deadline.
*   **Psychological Anchor**: Provides the necessary "healthy pressure" to decide between completing, parking, or skipping the current task.

## 4. Sovereign Undo (The Back Icon)
*   **Minimum Footprint**: Implemented via a persistent "Back" icon (curved arrow) near the navigation zone.
*   **State Reversal**: Clicking "Back" decrements the `currentIndex` and restores the previous task's state if it was modified in the current session.
*   **Safety Zone**: Mitigates accidental clicks without the complexity of timers or transient toasts.

## 5. Implementation Roadmap
- [ ] Circular Logic implementation in `LeanStackView`.
- [ ] Next-Anchored Guardian `$derived` rune logic.
- [ ] Triage-style contextual overlay for Lean Capture.
- [ ] Sovereign Undo (Back Icon) integration.
