# Round 2: Physics & Data Handoff (The Mechanic)

In this round, we define the "laws" of movement between the **Focus Card** and the **Architect List**.

## 1. The Modal Toggle (State Transition)
The view maintains a central `viewMode` state: `EXECUTION` (Card) or `PLANNING` (List).

*   **Tapping a "List" Icon**: Transitions from Card -> List. The `focusedIndex` is preserved.
*   **Tapping a Task Item in List**: Transitions from List -> Card. The `focusedIndex` is updated to the selected item.
*   **Archiving/Completing in Card**: Updates the task status (for Done) or moves the task out of the stack (for Archive), and automatically triggers the "Next Task" logic (Standard Loop). If the loop is finished, it transitions to the **Victory Lap**.
*   **Total Duration**: The card displays the "Effective Duration" based on central **[[ROLLUP_HEURISTICS]]**.

## 2. Focus Persistence (State Sovereignty)
To prevent the "Where am I?" feeling, the focus must be "sticky" between modes.

*   **Architect Edit**: If the user reorders the list while in Architect Mode, the `focusedIndex` must track the *Task ID*, not just the numeric index. 
*   **Example**: If I am focusing "Task A" (Index 0) and I move it to position 5 in the List, when I switch back to Card Mode, I should still see "Task A".

## 3. The "Physics" of the Card Loop
The Focus Card follows the **Circular Loop** mechanic, but with a mobile-optimized gesture set:

| Gesture | Action | Justification |
| :--- | :--- | :--- |
| **Swipe Down** | `Next` | Natural "pull" to bring the next task into view. |
| **Swipe Up** | `Undo` | Recovers the previous "pushed" state. |
| **Swipe Right** | `Complete` | Sets task status to `done`. |
| **Swipe Left** | `Archive` | Removes task from current stack (remains `todo` in source). |
| **Tap/Double Tap** | **Open as Note** | Tapping the task title or a dedicated "pencil" icon opens the markdown file in Obsidian's standard editor. |

## 4. The Escape Valve (Open as Note)
To support deep work, the user must be able to "exit" the stack to edit the underlying file.

*   **Trigger**: A dedicated "Edit/Pencil" icon (⠿) on the Focus Card and in each row of the Architect List.
*   **Physics (The Handshake)**:
    - **Execution**: The plugin uses `app.workspace.getLeaf().openFile(task.file)` to swap the current view for the Obsidian editor.
    - **Recovery**: The browser "Back" button (or swipe) in Obsidian returns the user to the Todo Flow view.
    - **Sovereignty**: While the note is open, the Todo Flow view is **Suspended**. It does not capture keys or gestures until it is re-focused.

## 5. Unified Creation (The Add Flow)
The mobile hybrid inherits the **[[UNIFIED_ADD_FLOW]]** mechanic. 
- **Trigger**: Global Floating Action Button (FAB) or Keyboard `Quick Add`.
- **Result**: Immediate optimistic injection into the current stack (or child stack) without view disruption.

## 6. Infinite Circularity (The Recursion Rule)
The "Focus/Architect" pattern is recursive. 
1. **Focus Card** of Task A (has children) -> Tap -> **Architect List** of Task A children (A.1, A.2).
2. Tap A.1 (has children) -> **Focus Card** of Task A.1 -> Tap -> **Architect List** of Task A.1 children (A.1.1, A.1.2).
3. This pattern repeats indefinitely. Navigation "Up" (Breadcrumbs/Back) pops the context stack one level at a time.

## 6. Sub-stack Entry & Navigation (The Nesting)
*   **Step 1: The Entry**: If a task card shows a "Sub-stack" indicator, tapping the card performs a **Focus Handshake** into that context. Unlike standard cards, this TRANSITIONS the view into **PLANNING (List) Mode** for that sub-stack. 
*   **Step 2: The Exit (Up)**:
    - **Physical Back Button**: (iOS/Android) Integration with Obsidian's standard back-history to return to the parent stack.
    - **Visual Breadcrumb**: A subtle "Parent Task Name" header above the Card or List. Tapping it returns to the parent context.
    - **Top-Down Logic**: If a user is at the root of a sub-stack, the "Undo" swipe on an empty stack (or a specific "Up" swipe) could also trigger the exit handle.

## 5. Summary of View Transitions
| Trigger | From | To | Result |
| :--- | :--- | :--- | :--- |
| **Tap Parent Card** | Card (Exec) | **List (Plan)** | Show sub-tasks at-a-glance. |
| **Tap List Item** | List (Plan) | Card (Exec) | Focus specific item. |
| **Back/Breadcrumb** | Child (Exec/Plan) | Parent (Plan) | Return to parent list. |

---
**Status**: ROUND 2 - DRAFTING
**Role**: Atlas Guardian (AG)
