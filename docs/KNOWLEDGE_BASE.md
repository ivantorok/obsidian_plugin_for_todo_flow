# Agentic Knowledge Base

This document serves as the "Persistent Memory" for agents working on the Todo Flow project. It tracks non-obvious discoveries, internal API patterns, and learned gotchas to ensure architectural consistency.

## 1. Interaction Patterns

### Static Interaction Pattern (Android Stability)
- **Problem**: On some Android hardware, interaction-based CSS changes (like `:active` or `:hover` background shifts) can "stick" or lag, creating a poor user experience.
- **Pattern**: Use static backgrounds for high-frequency buttons (like Triage "Shortlist"). Rely on parent motion (swipes) or final state changes for feedback.
- **Reference**: [UX_GOVERNANCE.md](./docs/UX_GOVERNANCE.md)

### The Handshake Pattern (Focus Sovereignty)
- **Problem**: Multiple views competing for keyboard events.
- **Pattern**: Centralized `ViewManager` grants "Sovereignty" to a specific leaf ID. Views must check `viewManager.isSovereign(this.leaf.id)` before responding to keyboard/gesture events.
- **Reference**: [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

### Context-Aware Command Delegation
- **Problem**: Global Obsidian commands (e.g. `add-task-to-stack`) incorrectly target a background view when a specialized view (e.g. `TriageView`) is sovereign.
- **Pattern**: Command callbacks in `main.ts` should check `activeLeaf.view.getViewType()`. If the sovereign view has a specialized handler (like `openAddModal`), delegate to it instead of the default leaf.
- **Reference**: BUG-001 Fix in `main.ts` (v1.2.27).

## 2. Obsidian Internal APIs

### Native History Integration
- **Discovery**: Setting `this.navigation = true` in an `ItemView` wrapper enables Obsidian's native navigation stack (back/forward buttons) for internal plugin transitions.
- **Usage**: Essential for "Drill-Down" and "Rollup" interactions.

## 3. Learned Gotchas

### Gesture Shadowing Collision (Nested Elements)
- **Issue**: Nested buttons in swipeable cards may fail to stop propagation of `pointerdown` events, leading to accidental card taps when a button is clicked.
- **Fix**: Always use `onpointerdown={(e) => e.stopPropagation()}` on internal interactive elements within swipeable containers.

### Global Gesture Shadowing Leak (Obsidian Interface)
- **Issue**: Obsidian's mobile sidebars (Left/Right) or pull-down search can be triggered during within-plugin swipes if the initial movement isn't immediately blocked.
- **Fix**: Call `e.stopPropagation()` and `e.stopImmediatePropagation()` at the VERY START of `touchstart` and `pointermove` handlers, even before crossing thresholds, if the intent is already locked. 
- **Reference**: BUG-017 (v1.2.29).
