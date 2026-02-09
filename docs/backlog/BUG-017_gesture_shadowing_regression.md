# BUG-017: Mobile Gesture Shadowing Regression

## 1. Context & Symptom
*   **User Story**: "The Competitive Swiper Story"
*   **Symptom**: When swiping a task card left/right on mobile to perform an action (Archive/Complete), the global Obsidian sidebar often slides out, or the pull-down-to-search (Command Palette) is triggered.
*   **Impact**: High frustration. Users feel they are fighting the app interface. "Twister with my phone."

## 2. Root Cause Hypothesis
The `StackView` task cards are handling `touchstart`, `touchmove`, and `touchend` events to calculate swipe deltas, but they are likely **not stopping propagation** of these events to the parent Obsidian app container.

Obsidian's mobile app listens for swipes on the main container to toggle sidebars. If our card doesn't explicitly say "I handled this, stop bubbling," Obsidian sees the swipe too.

## 3. Scope of Fix
*   **Target File**: `src/views/StackView.svelte`
*   **Mechanism**:
    *   Ensure `e.stopPropagation()` is called on `touchmove` when a swipe threshold is exceeded or when dragging starts.
    *   Ensure CSS `touch-action` is correctly set to `pan-y` (to allow vertical scrolling but maybe block horizontal pan if we handle it? Or we handle it manually).

## 4. Verification Plan
*   **E2E**:
    *   Simulate a swipe.
    *   Check if any "Sidebar" or "Command Palette" elements appear (this might be hard to detect if they are native Obsidian UI overlaid on webview, but we can check standard DOM elements if Obsidian exposes them).
    *   *Alternative*: Mock the window event listeners or check if `stopPropagation` was called on the event object in a Unit Test.

*   **Unit Test**:
    *   In `StackViewMobileGestures.test.ts`, simulate a touch event chain.
    *   Spy on `event.stopPropagation`.
    *   Assert it is called.
