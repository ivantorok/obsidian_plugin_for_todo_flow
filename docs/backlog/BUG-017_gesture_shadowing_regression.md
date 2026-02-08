# BUG-017: Mobile: Gestures leak to Obsidian system (Sidebar/Command Palette)

## Problem / Goal
Plugin gestures (swipes, reorder drags) are firing alongside Obsidian's default mobile gestures (sidebar toggle, pull-down to search).

## Current Behavior
Swiping right completes a task but also reveals the left sidebar. Dragging down to reorder triggers the Command Palette search.

## Expected Behavior
Plugin gestures should be "Shadowed". Once a plugin-specific movement threshold is crossed, all propagation to Obsidian's system gesture engine must be stopped.

## Steps to Reproduce (for Bugs)
1. Open Daily Stack on mobile.
2. Swipe right on a task.
3. Observe both task completion and sidebar opening.
4. Drag a task down and observe Command Palette opening.

## Proposed Test Case (TDD)
- [ ] E2E Test: Verify `e.stopPropagation()` or `e.preventDefault()` is correctly called in `handlePointerMove` and `handlePointerEnd` for mobile journeys.

## Context / Constraints
- Violates **Gesture Shadowing** axiom.
- Requires careful handling of `PointerEvents` and potentially `TouchEvents` to fully block Obsidian's native listeners.
