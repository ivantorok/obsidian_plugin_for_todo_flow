# FEAT-008: Mobile Stack Parity & Refinements

## Problem / Goal
The current mobile stack view (`LeanStackView.svelte`) lacks functional parity with the Desktop version and contains redundant UI elements. It needs to align with the core stack interactions while maintaining mobile ergonomics.

## Requirements (iOS Feedback - 2026-02-18)

### 1. Functional Parity
- **Desktop Actions Alignment**: Mobile buttons should trigger the same logic as desktop (e.g., specific state updates instead of just "next").
- **Anchoring**: Implement an "Anchor" button to pin tasks to their current time.
- **Done State Persistence**: Ensure "Done" status is correctly reflected in the Victory Lap/Dump View.
- **New Task Integration**: Use the same code/experience for adding new tasks as implemented in `TriageView` (FAB + QuickAdd).

### 2. UI/UX Clarity
- **Index/Position Display**: Show the current task's position in the stack (e.g., "3 of 10").
- **Start Time Display**: Clearly show the calculated start time for the current task.
- **Cleanups**: 
    - Remove redundant "Next" and "Park" buttons.
    - Keep "Increase/Decrease Duration" as they are working.

### 3. State Synchronization
- **Victory Lap Sync**: Ensure any duration or state changes made during the mobile stack session are immediately reflected in the final Victory Lap summary.

## Proposed Implementation Path
- Refactor `LeanStackView.svelte` to use centralized `StackController` methods for all actions.
- Integrate `TriageView` addition logic into `LeanStackView`.
- Update `DumpView` (Victory Lap) to subscription-based updates from the controller.

## UX Governance Compliance
- **Rule Alignment**: **Sovereignty Buffers**, **Progressive Disclosure**.
