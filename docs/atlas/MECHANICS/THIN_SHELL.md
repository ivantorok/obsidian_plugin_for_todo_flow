# Mechanic: Thin Shell Orchestration

Codifies the separation of concerns between raw business logic, state management, and the view layer.

## The Axioms
- **Passive Views**: Svelte components (`FocusStack`, `ArchitectStack`) MUST be passive projections of a shared state object (`navState`).
- **Orchestration Layer**: The `View` class (e.g., `StackView.ts`) acts as a "Thin Shell" that initializes and delegates to specialized manager objects.
- **Manager Isolation**: Logic for Gestures, Keyboard, Persistence, and State MUST reside in isolated manager classes/files, NOT in the component script.
- **Unidirectional Flow**: Views trigger events on the orchestrator -> Orchestrator calls Controller/Manager -> Manager updates shared state -> View reacts to state change.

## Implementation References
- `[[STACK]]` implementation in `v1.2.100` (`src/views/StackView.ts`).
- `src/views/StackSyncManager.ts` (Persistence isolation).
- `src/views/StackGestureManager.svelte.ts` (Mobile gesture isolation).
