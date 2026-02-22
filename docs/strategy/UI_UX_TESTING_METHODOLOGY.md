# Strategy: Cheap & High-Velocity UI/UX Testing

**Author**: Atlas Guardian  
**Status**: DRAFT  
**Context**: Item 16 — "Olcsó UI/UX tesztelési módszer" (Cheap UI/UX testing method)

## Core Philosophy
In a solo/small-team context, traditional lab-based UI/UX testing is too slow. We must leverage "Dogfooding" and "Skeptical Observation" to find 80% of bugs with 20% effort.

## 1. The "Blind Alley" Walkthrough
Before looking at the code, have the user (or yourself) perform a specific core flow (e.g., "Add a task and complete it") without any guidance.
- **Metric**: Number of "U-turns" (undoing a click, backtracking).
- **Fix**: Any U-turn indicates a failure of **Affordance** or **Intent Disambiguation**.

## 2. Perspective Shifts (Hardware Emulation)
Don't just test on a 2026 MacBook.
- **Memory Pressure**: Restrict environment to 8GB RAM (or use `stress-ng`).
- **Network Latency**: Use Chrome/Browser devtools to throttle network to "Slow 3G" during sync operations.
- **Touch Ergonomics**: Use "Mobile Emulation" but also **Physical Hand-Testing** on the lowest-end target hardware (e.g., an 8-year-old iPhone/Android).

## 3. The "Hungarian" Feedback Loop (Unguided Notes)
As seen in Session v3, capturing raw, stream-of-consciousness notes during a "live" session is more valuable than structured surveys.
- **Protocol**: 20 minutes of real task management -> Immediate data dump in native language -> Automated Translation -> Process Governor Triage.

## 4. Visual Hygiene Audit
- **The "Squint Test"**: Squint at the screen. Can you still tell which item is focused and which button is primary? If not, the **Visual Hierarchy** is weak.
- **Reachability Mapping**: Map out the 44x44px touch targets. If they overlap or are too close to the screen edge, they fail **Touch Sovereignty**.

## 5. Skeptical Specs (VO Protocol)
The Verification Officer should write tests that intentionally try to break the UI by:
- Double-clicking buttons super fast.
- Dragging items to valid and invalid targets simultaneously.
- Locking/Unlocking the screen during a transition.

---
*This methodology aims to institutionalize skepticism and dogfooding as the primary drivers of UX quality.*
