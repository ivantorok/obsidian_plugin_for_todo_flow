# Mechanic: Circular Loop

Defines the infinite navigation behavior on mobile to maintain flow without hitting a "dead end."

## The Behavior
- **Trigger**: Clicking `NEXT` on the final task card.
- **Action**: The index wraps around back to the beginning of the stack.
- **Victory condition**: If the loop completes and all tasks are processed, the `[[VICTORY_LAP]]` card is injected.

## Invariant
- The loop NEVER prunes tasks in real-time. It only changes the focus index. 
- A task marked "Done" is skipped in the next rotation (optional behavior based on `LoopManager` logic).

## Implementation References
- Managed by `LoopManager.ts`.
- Integrated into `LeanStackView.svelte`.
