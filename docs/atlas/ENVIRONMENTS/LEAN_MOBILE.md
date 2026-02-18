# Environment: Lean Mobile (Elias)

Defines the constraints and interaction patterns for mobile devices.

## Core Constraint: Low-End Hardware
- **Standard Interaction Patterns**: Favor buttons over fluid, resource-intensive gestures (reordering, swipe-to-archive).
- **Static Over Fluid**: Use static visual states for buttons. Rely on reactive projections (UI feedback) for cues.

## High-Stress Responsiveness
- **Vertical Viewport Focus**: Limit interaction to exactly ONE task card (Single-Card Mode).
- **Hardened Viewport Shifting**: Use the `[[VIEWPORT_SOVEREIGNTY]]` pattern to prevent keyboard occlusion.

## Mechanics Applied
- `[[CIRCULAR_LOOP]]`: Prevents "dead ends" in the execution flow.
- `[[VICTORY_LAP]]`: Finalizes a session summary.
- `[[OPTIMISTIC_SOVEREIGNTY]]`: Decouples UI from disk latency (Critical for 8GB RAM / high-latency storage).
