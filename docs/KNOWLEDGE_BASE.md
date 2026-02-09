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

## 2. Obsidian Internal APIs

### Native History Integration
- **Discovery**: Setting `this.navigation = true` in an `ItemView` wrapper enables Obsidian's native navigation stack (back/forward buttons) for internal plugin transitions.
- **Usage**: Essential for "Drill-Down" and "Rollup" interactions.

## 3. Learned Gotchas

### Gesture Shadowing Collision
- **Issue**: Nested buttons in swipeable cards may fail to stop propagation of `pointerdown` events, leading to accidental card taps when a button is clicked.
- **Fix**: Always use `onpointerdown={(e) => e.stopPropagation()}` on internal interactive elements within swipeable containers.
