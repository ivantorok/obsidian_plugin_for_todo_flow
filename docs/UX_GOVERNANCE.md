# Todo Flow: UX Governance

This document codifies the "Rules of the World" for the Todo Flow plugin. It serves as the source of truth for focus management, gesture handling, and keyboard interactions to ensure a consistent experience across Desktop and Mobile.

## 1. Focus Sovereignty: Who Owns the World?

Focus is the primary indicator of intent. Todo Flow assumes "Greedy Focus" when its views are active.

### Axioms
- **The Stack is Home**: When the Daily Stack view is active and no modals are open, the `StackView` container MUST hold focus to capture keyboard events.
- **Modal Dominance**: Modals (Help, Quick Add, Duration Picker) take absolute focus.
- **Escape to Home**: Pressing `Escape` inside any plugin modal MUST return focus to the `StackView` container upon closing.
- **Auto-Refocus**: If a user clicks a task card, the `StackView` container must immediately regain focus so that subsequent keyboard commands work without an extra click.

### Conflict Resolution
- **Obsidian Editor vs. Stack**: If the user is typing in a Markdown note (Obsidian Editor), Todo Flow MUST NOT capture navigation keys (`j`, `k`, `Space`).
- **Input Neutrality**: While a `Rename` or `StartTime` input is active, all global plugin keybindings are suspended. Only `Enter` (Confirm) and `Escape` (Cancel) are handled.

---

## 2. Gesture Hierarchy: Obsidian vs. Todo Flow

To prevent "Obsidian Ghosting," Todo Flow uses deterministic intent locking.

### Rules of Engagement
- **The 80px Threshold**: A horizontal movement is only recognized as a "Swipe" if it exceeds 80 pixels (defined in `gestures.ts`).
- **Drift Tolerance**: Vertical movement (`deltaY`) must be less than horizontal movement (`deltaX`) for a swipe to trigger. If `deltaY > deltaX`, the interaction is treated as a scroll (pass-through to Obsidian).
- **Handle Priority**: Touching the `drag-handle` immediately locks the interaction into **Reorder Mode**, bypassing swipe detection.

### Mobile UX Vocabulary
- **Gesture Shadowing**: When a plugin gesture (like Swipe) completely covers an Obsidian system gesture (like Sidebar toggle). Todo Flow uses `e.stopPropagation()` to shadow system gestures only after the 80px threshold is crossed.
- **Viewport Shifting**: When the keyboard opens (e.g., during Rename), the focused task card MUST be scrolled into the center of the viewport to prevent obscuration.
- **Static Interaction Pattern**: To ensure performance on varied hardware (specifically Android), high-frequency interaction buttons (like Triage "Shortlist") MUST NOT use background color changes or scaling for feedback. Feedback is provided solely by the "Reactive Projection" of the UI (swipe animations) or the final state change.
- **Content Containment**: All text content (titles, descriptions) MUST be contained within its component boundaries. Use wrapping or ellipsis to prevent horizontal overflow.

---

## 3. Keyboard Axioms: The Immutable Keys

Todo Flow follows a "Home Row First" philosophy for power users.

| Category | Keys | Action |
| :--- | :--- |
| **Selection** | `j` / `k` (or arrows) | Move focused index up/down |
| **Modification** | `f` / `d` (or arrows) | Scale duration up/down |
| **State** | `x` | Toggle Done status |
| **Movement** | `J` / `K` (Shift+j/k) | Move task item within the list |
| **Context** | `Enter` | Always Drill Down (Nav into stack, even if empty) |
| **Direct Open** | `Cmd/Ctrl/Shift + Enter` | Open as standard Obsidian File |
| **Hierarchy** | `h` | Go Back (Parent Stack) |

---

## 4. The Exception Pattern

When a rule has a conflict, we use the following hierarchy:
1.  **Component Internal**: `HTMLInputElement` captures everything first.
2.  **Plugin Global**: `KeybindingManager` checks for active Modal states.
3.  **Application Global**: If no plugin match, allow event to bubble to Obsidian.

> [!IMPORTANT]
> **Deterministic Exception**: If `j` or `k` is pressed while the `Rename` input is focused, the character MUST be typed. The `StackView` MUST NOT navigate.

---

## 5. Enforcement & Testing

Developers must verify behavioral changes against the **Golden Suite**:
- **Axiom Verification**: Any change to `keybindings.ts` must pass `tests/e2e/journeys/desktop_full_journey.spec.ts`.
- **Gesture Stability**: Any change to `gestures.ts` or `touch-action` CSS must pass `tests/e2e/journeys/mobile_full_journey.spec.ts`.
- **Focus Regression**: Manual check: "Open Quick Add -> Type -> Esc -> Press 'j'". If the selection doesn't move, focus sovereignty is broken.
