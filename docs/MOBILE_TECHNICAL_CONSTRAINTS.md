# Mobile Technical Constraints & UX Contradictions

This document explores the "invisible" limitations of mobile development and the inherent contradictions (oxymorons) in mobile UI design.

## 1. Technical Bottlenecks (The "Physics")

### A. The Main Thread Bottleneck
Mobile CPUs (even on high-end phones) are significantly slower at single-core JavaScript execution than desktop CPUs.
*   **The Problem**: Every gesture, animation, and logic update runs on a single "Main Thread." If you are calculating a complex schedule while the user is swiping, the frame rate drops below 60fps (jank).
*   **The Handoff**: For optimal performance, we move the "heavy lifting" (visual movement) to the **GPU** using CSS `transform` and `opacity`. The JS thread only handles the "logic" of the gesture, while the hardware handles the "look."

### B. The DOM Complexity Tax
Browsers struggle to manage thousands of nested HTML elements on mobile.
*   **The Problem**: A list with 50 tasks, each with buttons, text, and icons, can create a "DOM heavy" view. Scrolling this list causes the browser to constantly recalculate styles.
*   **The Handoff**: We use **Virtualization** (rendering only the 5-10 tasks visible on screen) and **Layer Promotion** (creating separate GPU layers for interactive elements).

### C. Event Latency (The 300ms Ghost)
Modern mobile browsers have improved, but there is still a mechanical delay between a physical touch and the computer "knowing" what happened.
*   **The Problem**: The system has to wait to see if you are going to tap again (Double Tap) or start moving (Swipe).
*   **The Handoff**: We use **Passive Event Listeners** and **Immediate Feedback Patterns** (changing an active state instantly before the logic even executes).

---

## 2. UX Contradictions (The Oxymorons)

These are demands that sound good on paper but fight each other in reality.

### A. "The Dense Minimalist"
*   **Demand**: "I want to see my whole day's schedule at a glance, but the UI should be clean, airy, and beautiful."
*   **The Conflict**: Mobile screens are tiny. To show "everything," you have to make text small (unreadable) or buttons tiny (un-tappable).
*   **The Resolution**: **Progressive Disclosure**. Hide the metadata (Date, ID) until it's absolutely needed, and use **Sovereignty Buffers** to focus on one task at a time.

### B. "The Discoverable Invisible"
*   **Demand**: "The app should be so simple there are no buttons, but I should intuitively know I can swipe, double-tap, and long-press every item."
*   **The Conflict**: Invisible gestures have zero discoverability. If there is no button, a new user will never find the feature.
*   **The Resolution**: **Visual Affordances**. Use a small "Drag Handle" (⠿) or subtle "Pencil Icon" to hint at the deeper interactions without cluttering the screen.

### C. "The Instant Permanent"
*   **Demand**: "The app should feel instant and snappy, but I need to be 100% sure my data is saved to a file on disk before I move to the next thing."
*   **The Conflict**: Writing to a file (Disk I/O) takes time. If the UI waits for the file to save, it feels sluggish. On Linux hardware with limited RAM (e.g., 8GB), synchronous I/O can cause the Main Thread to lock during UI render cycles, resulting in "stuck" interactions.
*   **The Resolution**: **Optimistic UI**. Update the screen instantly (assuming success) and handle the slow disk write in the background (using non-blocking `vault.process`). assumptions: the UI state is Svelte-native and assumes success before the disk ACK.

### D. "The Native Web App"
*   **Demand**: "It should feel exactly like a native iOS/Android app, but it should run inside the Obsidian browser and use the same code as the Desktop version."
*   **The Conflict**: Web browsers and Native OSs have different "physics" for scrolling, bouncing, and zooming.
*   **The Resolution**: **Platform Intelligence**. The code must detect `isMobile` and swap out desktop logic (hover effects) for mobile logic (gestures) while maintaining the same "core" data engine.
