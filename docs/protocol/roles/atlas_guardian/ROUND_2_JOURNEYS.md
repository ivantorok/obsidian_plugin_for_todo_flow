# Round 2 Addendum: User Journey Illustrations

These journeys illustrate the "Physics" defined in [ROUND_2_PHYSICS.md](file:///Users/i525277/github/obsidian_plugin_for_todo_flow/docs/protocol/roles/atlas_guardian/ROUND_2_PHYSICS.md).

## Journey 1: The "Straight Shooter" (Pure Execution)
**Context**: User has 3 tasks in their Daily Stack. They are in **Focus Mode** (Card View).

1.  **Visual**: The screen is dominated by "Task A: 30m".
2.  **Action**: User completes Task A. They **Swipe Right**.
3.  **Physics**: The card slides right and disappears. "Task B: 15m" immediately slides in from the left/bottom (Optimistic UI).
4.  **Action**: Task B is a sub-stack. The card shows a "Drill Down" indicator. User **Taps the Card**.
5.  **Physics**: A **Focus Handshake** occurs. The view TRANSITIONS from **Focus Mode** (Card) to **Architect Mode** (List), displaying all sub-tasks of Task B.
6.  **Action**: User **Taps a Breadcrumb** or the phone's **Back Button**.
7.  **Physics**: The view returns to the Parent Stack's **Architect Mode** (List).

## Journey 4: The Deep Dive (Editing a Note)
**Context**: User is in **Focus Mode** and realizes they need to add a shopping list *inside* the "Grocery Shopping" task note.

1.  **Action**: User **Taps the "Pencil" Icon** on the "Grocery Shopping" card.
2.  **Physics**: The Focus Mode view is swapped for the standard Obsidian editor showing `Grocery_Shopping.md`.
3.  **Action**: User types their list.
4.  **Action**: User **Swipes Back** (Native Android/iOS gesture) or clicks the "Back" arrow.
5.  **Physics**: The Todo Flow view is restored. The user is exactly where they left off: looking at the "Grocery Shopping" card in **Focus Mode**.

## Journey 5: The Nested Infinite Loop (Hierarchy Support)
**Context**: User is in a "Spring Cleaning" stack.

1.  **Visual**: "Spring Cleaning" Card.
2.  **Action**: User **Taps the Card** (to see the sub-steps).
3.  **Physics**: Transition to **Architect Mode** (List) shows sub-tasks: "Kitchen", "Living Room", "Garage".
4.  **Action**: User **Taps "Kitchen"**.
5.  **Physics**: Transition to **Focus Mode** (Card) shows "Kitchen" card.
6.  **Action**: User **Taps "Kitchen" Card** (because it also has sub-steps).
7.  **Physics**: Transition to **Architect Mode** (List) shows: "Deep clean oven", "Mop floor".
8.  **Action**: User **Taps "Deep clean oven"**.
9.  **Physics**: Transition to **Focus Mode** (Card) shows "Deep clean oven" card.
10. **Action**: User **Backs out** (Breadcrumb: "Kitchen").
11. **Physics**: Returns to **Architect Mode** (List) for "Kitchen".

## Journey 2: The "Mid-Day Adjustment" (Planning Pivot)
**Context**: User is working on "Task C" but realizes "Task D" (further down the list) is now more urgent.

1.  **Visual**: User is looking at the card for "Task C".
2.  **Action**: User **Taps the "List" Icon** in the corner.
3.  **Physics**: The card shrinks/cross-fades into a high-density vertical list. "Task C" is highlighted in the list (Focus Persistence).
4.  **Action**: User uses the **Drag Handle** to move "Task D" to the top, above "Task C".
5.  **Physics**: The list reorders statically. "Task D" is now at index 0.
6.  **Action**: User **Taps "Task D"**.
7.  **Physics**: The view transitions back to **Focus Mode**. The card for "Task D" is now front and center.

## Journey 3: The "Oops, Not Really Done" (Loop Recovery)
**Context**: User accidentally swiped right on a task they didn't finish.

1.  **Action**: User **Swipes Up**.
2.  **Physics**: The previous task "pops" back onto the screen, restoring its previous state and position in the loop.

---
**Status**: ROUND 2 - ADDENDUM
**Role**: Atlas Guardian (AG)
