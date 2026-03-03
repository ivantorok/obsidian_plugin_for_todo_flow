# UI Prototyping Workbench

This sandbox is used for rapidly iterating on UI concepts in isolation ("mobile jail").

## Current Prototyping Paradigm (The Two-View Split)

We are currently prototyping two distinct, isolated HTML views to test specific interaction rules before integrating them.

### 1. The Stack View (`architect.html`, `focus.html`, `index.html`)
- **Visuals**: Tasks are represented as horizontal rows/lines.
- **Interactions**: Heavy gesture reliance.
  - Swipe Left: Archive
  - Swipe Right: Complete
  - Scroll & Single Tap: Selection
  - Long Press (Tap & Hold): Switch between scrolling and drag-and-drop reordering, or open the detailed view.
  - Double Tap: Undo.

### 2. The Detailed Task View (`detailed.html`)
- **Visuals**: A completely separate, full-screen view (or viewport-aware modal) showing the deep content and controls for a single task.
- **Interactions**: No gestures allowed. Strictly taps on buttons and keyboard input.
