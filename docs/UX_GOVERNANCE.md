# Todo Flow: UX Governance

This document codifies the "Rules of the World" for the Todo Flow plugin. It serves as the source of truth for focus management, gesture handling, and keyboard interactions to ensure a consistent experience across Desktop and Mobile.

## 1. Focus Sovereignty: Who Owns the World?

Focus is the primary indicator of intent. Todo Flow assumes "Greedy Focus" when its views are active.

### Axioms
- **The Stack is Home**: When the Daily Stack view is active and no modals are open, the `StackView` container MUST hold focus to capture keyboard events.
- **Modal Dominance**: Modals (Help, Quick Add, Duration Picker) take absolute focus.
- **Escape to Home**: Pressing `Escape` inside any plugin modal MUST return focus to the `StackView` container upon closing.
- **Auto-Refocus**: If a user clicks a task card, the `StackView` container must immediately regain focus so that subsequent keyboard commands work without an extra click.
- **Selection Parity**: The `focusedIndex` MUST remain synchronized across all interaction layers (Keyboard, Gestures, Menu). If a command moves a task (e.g., via Double-Tap Anchor), the reactive selection must follow the task to its new index immediately. Stale selection is considered a Core Bug.

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
- **Gesture Shadowing**: When a plugin gesture (like Swipe) completely covers an Obsidian system gesture (like Sidebar toggle). Todo Flow MUST use `e.stopPropagation()` and `e.stopImmediatePropagation()` to shadow system gestures. This blockage MUST occur as soon as the plugin claims the interaction, preventing the "Host Leak" where Obsidian sees the initial movement.
- **Viewport Shifting (Hardened)**: All interactive inputs on mobile (Rename, Start Time, etc.) MUST use the `ViewportService` to handle the Virtual Keyboard Layout Shift (VKLS). Standard `focus()` is forbidden as it often leaves a "grey gap" or occludes content.
33: - **Editing Buffer (Sovereignty)**: To ensure centering for items at the end of a list, the container MUST provide a dynamic bottom buffer (e.g., `50vh`) while in an active editing state. This "Editing Buffer" allows the `scrollIntoView({ block: 'center' })` logic to function correctly regardless of item position.
- **Static Interaction Pattern**: To ensure performance on varied hardware (specifically Android), high-frequency interaction buttons (like Triage "Shortlist") MUST NOT use background color changes or scaling for feedback. Feedback is provided solely by the "Reactive Projection" of the UI (swipe animations) or the final state change.
- **Content Containment**: All text content (titles, descriptions) MUST be contained within its component boundaries. Use wrapping or ellipsis to prevent horizontal overflow.
- **Mobile Card Anatomy**:
    - **Density**: Task titles are limited to 1-2 lines. Metadata (Time, Duration) moves to a secondary line.
    - **Date Scoping**: Dates are HIDDEN on mobile cards (context is implied by the view) to reduce visual noise.
- **Relaxed Precision**: Double-tap gestures must use a relaxed window (>400ms) to accommodate valid mobile input speeds without requiring superhuman reflexes.
- **Workflow Continuity**: When a workflow transition (like Triage -> Stack) encounters existing data, it MUST NOT proceed automatically. A "Conflict Card" or modal must be presented. The primary action (Swipe Right/Confirm) should default to "Merge (Append)" to prioritize data retention, while a secondary or destructive action (Swipe Left/Cancel) handles "Overwrite (Fresh)."
- **Optimistic UI Pattern**: For high-latency operations like task creation, the UI MUST update immediately to reflect intent. The backing system performs disk I/O asynchronously. If the operation fails, the UI must self-correct (revert), but the happy path assumes success to maintain flow.

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
