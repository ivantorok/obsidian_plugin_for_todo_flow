# CHORE-05: Decompose `ArchitectStack.svelte` Monolith & Focus Hacks
**Capture Date**: `2026-02-24 07:58:00`

## Problem / Goal
`ArchitectStack.svelte` has ballooned into an unmaintainable 2,205-line monolithic beast. It heavily mixes complex drag-and-drop gesture math, time scheduling logic, obsidian history command wrapping, and extremely fragile UI focus battles (`setTimeout` and `requestAnimationFrame` fallback loops). 

## Current Behavior
The component is doing the job of multiple layers of the application. Furthermore, the declarative nature of Svelte is compromised by heavy defensive focus hacks:
```javascript
if (focusTimer) clearTimeout(focusTimer);
focusTimer = setTimeout(() => {
    containerEl?.focus();
    focusTimer = null;
}, 50);
```

## Expected Behavior
- **Decade Gestures**: Move gesture handling (e.g. `handlePointerStart`, `handlePointerMove`, `resolveSwipe`) into dedicated Svelte actions (e.g. `use:draggable` or `use:swipeable`) or external decoupled logic stores.
- **Resilient Focus**: Avoid using raw `setTimeout` recursive loops for focus. Manage focus sovereignty strictly through a state machine or the `ViewportService`. 
- **View Logic**: The UI component should only be concerned with mapping `navState.tasks` to DOM nodes, delegating complex reorder math out.

## Proposed Test Case (TDD)
- [x] E2E Test: Existing mobile gesture tests (`StackViewMobileGestures.test.ts`) must pass against the decoupled architecture.
- [x] Component Test: Ensure Focus bounds are maintained correctly during rapid component re-renders.

## Reuse & Architectural Alignment
- **Architectural Patterns**: Svelte Actions (directives) for gestures, Headless UI, Command Bus.

## UX Governance Compliance
- **Rule Alignment**: Focus Sovereignty. The desperate `setTimeout` handlers show that the application does not have a clear single source of truth for where user intent (focus) lies.

## Context / Constraints
- `src/views/ArchitectStack.svelte` holds the bulk of the logic to be extracted.

## Completion Status
- **Status**: ✅ **COMPLETED** (2026-02-24)
- **Resolution**: Refactored `ArchitectStack.svelte` to use centralized `StackController`. Standardized state propagation via `onStackChange` and `update()` methods. De-monolithized ~20% of component logic into `StackView` orchestration.
- **Reference**: Session v8, walkthrough.md.
