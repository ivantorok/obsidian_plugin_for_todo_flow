# FEAT-009: Lean Mobile Split (The "Elias 2.0" Structural Refactor)

## Context
Our `STRATEGY_LEAN_MOBILE.md` calls for an "Essentialist" approach to mobile interaction: Zero-logic HTML rendering, static over fluid, and bypassing the physics engine for performance on low-end hardware.

## Current State & Friction
Currently, `StackView.svelte` is a monolithic 2,200+ line component. It houses the heavy `$effect` physics loops, drag-and-drop boundary scanning, and desktop-grade keybinding logic. Even when `viewMode === 'focus'` is triggered on mobile, these heavy subsystems mount and calculate in the background, violating the Lean Mobile philosophy. This causes unnecessary battery drain and potential main-thread stuttering.

## Strategic Realignment
We must structurally decouple the presentation layers.

### Phase 1: The Split
1.  **`ArchitectStack.svelte`**: Rename the core of the current `StackView.svelte` to `ArchitectStack.svelte`. This owns fluid gestures, `Shift+J/K` sorting, resizing logic, and heavy DOM recalculations.
2.  **`FocusStack.svelte`**: Create a brand new, lightweight Svelte component. It should receive only the `focusedIndex` task and *maybe* `index + 1`. It uses standard HTML buttons for "DONE" and "PARK". No pointer-capture dragging, no $effect schedule recalculations. 

### Phase 2: Orchestration
The root `StackView` class (the ItemView wrapper) or a very thin root Svelte component (`StackController.svelte`) should act as the orchestrator.
*   If `isMobile` (or user selects Focus mode) -> Destroy `ArchitectStack` and mount `FocusStack`.
*   This ensures the V8 engine literally garbage collects the heavy listeners.

### Exit Criteria
- `StackView.svelte` is broken apart.
- Re-running the UI on a low-end mobile simulator shows a 50%+ reduction in generic `$effect` triggers during idle.
- "Elias 1.0" static "DONE / NEXT" interactions are achieved without the `resolveSwipe` physics loop firing.

## Priority
Epic. Required for long-term viability of the Lean Mobile strategy.
