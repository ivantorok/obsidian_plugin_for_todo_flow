# Mechanic: Victory Lap

A psychological closure stage for mobile sessions.

## Characteristics
- **Visual**: A "Bird's Eye View" summary card showing the status of all tasks in the current session.
- **Actions**:
    - **Restart Loop**: Zeroes the index and hides the victory card.
    - **Close Session**: Detaches the workspace leaf.
    - **Undo Last**: Reverts the final status change if it triggered the victory state.

## Rules of Engagement
- The Victory Lap card MUST NOT be dismissible by accidental swipes.
- It acts as a "Stage" within the `[[STACK]]` phase but has its own logic and UI state.
