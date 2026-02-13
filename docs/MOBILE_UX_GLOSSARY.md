# Mobile UX & Interaction Glossary

This document provides the standard vocabulary for describing mobile user interfaces and interactions within the Todo Flow project. Use these terms to ensure clear communication between design intent and technical implementation.

## 1. Atomic Interactions (The "Touch")
*   **Tap (Single Tap)**: A quick touch and release. The mobile equivalent of a "Click."
*   **Double Tap**: Two taps in quick succession (e.g., within 450ms). Used for secondary toggles (Anchor).
*   **Long Press (Hold)**: Touching and maintaining contact for a sustained period (e.g., >500ms). Often triggers context menus or reorder modes.
*   **Pointer Capture**: A technical state where an element "grabs" all touch movement events even if the finger moves outside the element's boundaries. Crucial for reliable swiping.

## 2. Directional Gestures (The "Move")
*   **Swipe**: A fast, horizontal or vertical flick.
    *   **Threshold**: The minimum distance (e.g., 80px) required to trigger the action.
    *   **Velocity**: The speed of the swipe, sometimes used to determine intent.
*   **Drag**: A slow, controlled move where the UI element follows the finger's position.
*   **Pan**: Moving your finger across the screen to scroll or shift the viewport.
*   **Dead Zone (Slop)**: A small area (e.g., 10px) where movement is ignored to prevent accidental triggers during a simple tap.

## 3. Visual Feedback (The "Reaction")
*   **Haptics**: Tactile feedback (vibrations).
    *   **Light/Selection**: Subtle "tick" for focus changes.
    *   **Medium/Impact**: Feedback for completing a swipe action.
    *   **Heavy/Error**: Feedback for destructive or blocked actions.
*   **Projection**: The visual translation or rotation of an element as you swipe it (before the action is committed).
*   **Active State**: The visual change (color, scale) when a finger is currently pressing down on an element.
*   **Optimistic Update**: When the UI changes immediately assumes success before the background process (like saving to disk) finishes.

### 4. System Thinking (The "Logic")
*   **Intent Locking**: The logic that decides which gesture wins. If you move 5px vertically, the system "locks" into scrolling and ignores horizontal swipes.
*   **Gesture Shadowing**: When a plugin gesture prevents a system gesture (like Obsidian's sidebar toggle) from triggering.
*   **Focus Sovereignty**: The rule that only one element "owns" the keyboard or gesture input at a time.
*   **Viewport Shifting (VKLS)**: "Virtual Keyboard Layout Shift." How the UI adjusts when the on-screen keyboard appears.
    *   **Top Alignment**: A specific shifting strategy where the active input is scrolled to the top 40% of the viewport to ensure it's not occluded by the virtual keyboard.
*   **Sovereignty Buffer**: Extra space (e.g., 50vh at the bottom) added to a list so the focused item can be centered (or top-aligned) even if it's the last item in the list.

## 5. UI Elements
*   **Drag Handle (Affordance)**: A visual indicator (like ⠿) that tells the user "you can drag this."
*   **Edit Indicator**: A small icon (e.g., a pencil/edit icon) that signals an element is interactive/editable on tap.
*   **Floating Action Button (FAB)**: A primary action button (usually a `+`) that "floats" over the content, typically used for creating new items.
*   **Sheet / Drawer**: A UI component that slides up from the bottom of the screen.
*   **Scrim / Overlay**: The semi-transparent background that appears behind a modal to dim the rest of the app.
