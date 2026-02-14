# Primitive: Focus Handshake

Defines the protocol for keyboard event ownership in a multi-view environment.

## The Axioms
- **Greedy Focus**: When a Todo Flow view is active, it MUST capture navigation keys (`j`, `k`, `Space`) unless an explicit exception applies.
- **Sovereign View**: A central `ViewManager` tracks exactly one "Sovereign View" that holds the handshake. Non-sovereign views MUST NOT act on global keybindings.
- **Modal Dominance**: Modals (Quick Add, Help) take absolute focus. Upon closing via `Escape`, focus MUST return to the previously Sovereign View.

## Interaction Sovereignty Patterns
- **Input Neutrality**: While an `HTMLInputElement` or `textarea` is active, all plugin-level hotkeys are suspended to allow standard text entry.
- **Auto-Refocus**: Clicking any internal element (e.g., a task card) must trigger a focus call on the view container to ensure the keyboard remains engaged.

## Implementation References
- `[[STACK]]` uses the handshake to manage `focusedIndex` synchronization.
- `[[TRIAGE]]` uses it to capture swipe-mimic keyboard actions.
