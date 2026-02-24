# Mechanic: UI Feedback

Defines how the system communicates command results and state changes to the user.

## The Axioms
- **No Silent Failures**: Every command that explicitly fails (e.g., no tasks found, invalid input) MUST trigger a `Notice` to the user.
- **Reactive Projection (Axiom)**: The UI MUST be a pure, reactive projection of the internal state (`navState`). Managers (e.g., `StackStateManager`) are responsible for ensuring this bridge remains synchronized without side-effect leaks.
- **Immediate Projection**: Successful view-swapping commands (e.g., `Start Triage`) MUST result in an immediate visual transition.
- **Handshake Orchestration**: Complex interactions (Gestures, Keyboard) MUST be handled by specialized managers (`StackGestureManager`, `StackKeyboardManager`) to prevent view-level logic bloat.
- **Spinners/Loaders**: If an operation takes longer than 200ms (e.g., large file graph building), a loading state MUST be displayed.

## Implementation References
- Standard Obsidian `Notice` is used for ephemeral alerts.
- `[[TRIAGE]]` and `[[STACK]]` views use Svelte transitions to signal state shifts.
