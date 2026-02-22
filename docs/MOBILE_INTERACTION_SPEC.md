# Mobile Interaction Specification

This document translates the user-facing features and "civilian" stories into technical interaction patterns using the vocabulary defined in the [Mobile UX Glossary](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/MOBILE_UX_GLOSSARY.md).

## 0. Core UI Architecture & Terminology

### 0.1 "Time-First" Card Architecture
*   **Primary Content Row**: Each **Card Component** uses a **Horizontal Inline Layout** featuring a **Leading Time-Stamp** (High-Emphasis Typography) followed immediately by the **Task Label** (Body-Large). Secondary metadata is removed for **Minimalist Information Density**.
*   **Visual Padding**: Uniform **Internal Cell Padding** creates a clear **Content Box**, separating the Time-Stamp and Task Label with a fixed **Horizontal Spacer**.

### 0.2 The "Anchored" State
*   **Surface Logic**: When a card enters the **Anchored State** (pinned to the top/active), the **Container Surface Color** shifts to a **Darker Shade Token** (e.g., Neutral-200).
*   **Elevation & Contrast**: The **Stroke (Border)** weight increments, or a subtle **Inner Shadow** is applied to indicate the card is 'seated' or locked into focus.

### 0.3 Resolving Gestural Conflicts (Scroll vs. Drag)
To prevent conflicts between **Vertical Scrolling** and **Vertical Drag-and-Drop**, one of two patterns is enforced:
*   **Option A (Long-Press to Reorder)**: Separates **Scroll Physics** from **Drag Logic** via a **Long-Press Gesture** (e.g., 300ms hold). The card enters a **Lifted State** (increased Z-index/scale), hijacking the vertical axis for **Manual Reordering**.
*   **Option B (Drag Handle / Grabber)**: Reserves the **Leading Edge** for a dedicated **6-dot Drag Handle icon**. Vertical touches on the handle trigger **Reorder Logic**; all other touches on the **Card Surface** default to **List Scrolling**.

### 0.4 Defining the Horizontal Axis (Swiping)
The horizontal axis is reserved for **Contextual Swipe Actions**:
*   **Swipe-Start (Left-to-Right)**: Reveals a 'Complete' action with a **Success-Color Background**.
*   **Swipe-End (Right-to-Left)**: Reveals 'Delete' or 'Archive' with an **Error-Color Background**.
*   **Haptic Trigger**: Crossing the **Swipe Threshold** triggers a **Haptic Pulse** to confirm the action is 'primed'.

---

## 1. Feature-to-Interaction Mapping

| Feature | Interaction | Glossary Terminology |
| :--- | :--- | :--- |
| **Selection (Focus)** | Single Tap | Focused **Tap** updates the **Focused Index** and triggers **Viewport Service** for centering. |
| **Complete Task** | Swipe Right | **Horizontal Swipe** exceeding **Threshold** (80px) with **Haptic Impact**. |
| **Archive Task** | Swipe Left | **Horizontal Swipe** exceeding **Threshold** (80px) with **Haptic Impact**. |
| **Anchor Task** | Double Tap | Two **Taps** within the **Double Tap Window** (450ms). |
| **Reorder Task** | Drag Handle | Immediate **Intent Lock** on **Pointer Capture**. |
| **Reorder Task** | Vertical Drag | **Vertical Drag** with `deltaY > deltaX * 1.2` triggered after **Intent Lock**. |
| **Drill Down** | Single Tap (Focused) | Focused **Tap** triggers **Progressive Disclosure** / Navigation. |
| **Rename Task** | Single Tap (Title) | Focused **Tap** triggers **Viewport Shifting (VKLS)** for input sovereignty. |
| **Increase/Decrease** | Tap (+/- Buttons) | **Tap** on **Active State** UI elements to modify duration. |
| **Back Navigation** | Tap (Back UI) | **Tap** on a dedicated UI element to pop the navigation stack. |
| **Add New Task** | Tap (FAB) | **Tap** on the **Floating Action Button** to open QuickAdd. |
| **Triage: Shortlist** | Swipe Right | **Horizontal Swipe** triggering a **Tray** state update. |
| **Triage: Archive** | Swipe Left | **Horizontal Swipe** triggering a **Tray** state update. |
| **Global Actions** | Hybrid Input | Support for **Keyboard Shortcuts** (e.g., `z` for Archive) even on mobile (Bluetooth keyboards). |

---

## 2. Technical Story Translation

### Story 3: "The Ghostly Sidebar"
*   **Civilian Version**: "The sidebar pops out when I try to scroll."
*   **Technical Reality**: Failure of **Intent Locking** and **Dead Zone** logic. Vertical scroll movement (`deltaY`) is bleeding into horizontal swipe detection.
*   **Requirement**: Harden **Gesture Shadowing** to ensure the plugin claims the pointer immediately if movement exceeds the 10px **Dead Zone**.

### Story 4: "The Hidden Text"
*   **Civilian Version**: "The keyboard covers the words I'm typing."
*   **Technical Reality**: Inadequate **Viewport Shifting (VKLS)** and missing **Sovereignty Buffer**.
*   **Requirement**: Recalculate the container scroll position using `ViewportService` and ensure a `50vh` **Sovereignty Buffer** is present to allow for **Top Alignment** above the keyboard.

### Story 6: "The Sticky Button"
*   **Civilian Version**: "The button stays blue after I press it."
*   **Technical Reality**: Misuse of the **Active State** on higher-latency hardware.
*   **Requirement**: Switch to a **Static Interaction Pattern**. Remove all background-color transitions from the `.shortlist` and `.archive` buttons.

### Story 9: "The Runaway Title"
*   **Civilian Version**: "Long descriptions go off the edge of the screen."
*   **Technical Reality**: Violation of **Content Containment**.
*   **Requirement**: Enforce text-clamping (e.g., `webkit-line-clamp: 2`) to maintain **Density** without breaking the layout.

### Story 10: "The Competitive Swiper"
*   **Civilian Version**: "My phone does two things at once when I swipe."
*   **Technical Reality**: Missing `e.stopPropagation()` and `e.stopImmediatePropagation()` for **Gesture Shadowing**.
*   **Requirement**: Ensure **Pointer Capture** is active and event bubbling is halted as soon as the **Threshold** is reached.

### BUG-011: "Body Drag vs. Handle Drag"
*   **Technical Reality**: **Intent Locking** is currently restricted to the **Drag Handle (Affordance)**.
*   **Requirement**: Expand **Pointer Capture** to the entire task card while distinguishing between a **Pan** (scroll) and a **Vertical Drag** (reorder).

### BUG-020: "The Selection Jump"
*   **Technical Reality**: **Focused Index** desynchronization after an **Optimistic Update** triggers a sort.
*   **Requirement**: Ensure **Focus Sovereignty** is maintained by recalculating the index of the operating task *after* the command completes.

## 3. Project Law: Mobile Intent Sovereignty

To ensure a consistent and predictable specialized UX on mobile, the following mappings are **hardcoded** and cannot be overridden by user settings while in `ArchitectStack` mode:

1. **Right Swipe** -> `complete`
2. **Left Swipe** -> `archive`
3. **Double Tap** -> `anchor`

**Rationale**: Mobile users rely on muscle memory and high-frequency gestures. Buffering these behind configurable settings introduces testing complexity and "UX Drift." By hardcoding these at the component level, we guarantee the "Static Interaction Pattern" mandated for mobile reliability.
