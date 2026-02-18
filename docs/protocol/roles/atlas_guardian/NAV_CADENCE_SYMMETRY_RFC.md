# Side Quest: Navigation Cadence Symmetry

This document resolves the "Drill-up" cadence for the Mobile Hybrid model to ensure the user never feels lost in the hierarchy.

## 1. The Symmetry Principle
Navigation should be **Reflexive**. The path taken to get "In" should be mirrored when going "Out."

### The "Drill-Down" Path (Getting In)
1.  **Level 0 (Root List)**: User views all projects.
2.  **Level 0 (Focused Card)**: User focuses on "Project A."
3.  **Level 1 (Project A List)**: User enters Project A (List Mode) to see sub-tasks.
4.  **Level 1 (Focused Card)**: User focuses on "Sub-task A.1."
5.  ...and so on.

### The "Drill-Up" Path (Getting Out)
To maintain the same cadence, the "Back" action should pop the stack level-by-level:
1.  **Level 1 (Focused Card)** -> (Back) -> **Level 1 (Project A List)**.
2.  **Level 1 (Project A List)** -> (Back) -> **Level 0 (Focused Card)** (Project A).
3.  **Level 0 (Focused Card)** -> (Back) -> **Level 0 (Root List)**.

## 2. Competitive Cadences
| Pattern | Path | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Symmetric** | Card <-> List | Clear hierarchy, preserves "The Moment." | More "clicks" to return home. |
| **Asymmetric** | Card -> List -> (Home) | Fast exit. | Mental jarring; loses context of where you came from. |

## 3. The "Breadcrumb" Solution (Experimental)
> [!NOTE]
> This is a candidate for removal if it clutters the interface.
> We will implement it as an optional "Secondary Affordance."

We use a **Visual Breadcrumb** at the top of the view:
`Projects > Project A > [Sub-task A.1]`

*   **Tapping a broad level** (e.g., "Projects") jumps straight back to the Root List.
*   **Tapping the immediate parent** (e.g., "Project A") returns one level up to that parent's List.

## 4. Decision
We adopt the **Symmetric Pattern** with **Experimental Breadcrumb Jump-points**. This ensures that the user can move level-by-level for fine control, or "Leap" back to the root for strategic shifts, but we remain ready to prune the UI if it feels "too much" on small screens.

---
**Status**: SIDE QUEST - PENDING REVIEW
**Role**: Atlas Guardian (AG)
