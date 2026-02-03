# Mobile Experience Improvements (BUG-004, BUG-002, BUG-003)

Fixed major mobile regressions including task reordering, adding tasks, and exporting.

## Changes Made

### 📱 BUG-004: Mobile Reordering
- **Refined Intent Locking**: Improved the logic for distinguishing between vertical drags (reordering) and horizontal swipes.
- **Hold-to-Drag**: Implemented a 350ms long-press mechanism for card bodies to initiate reordering on mobile.
- **Touch Action Optimization**: Dynamically set `touch-action: none` during active drags to prevent native browser scrolling/refresh.
- **Gesture Conflict Resolution**: Removed redundant `ontouch*` listeners in favor of unified `onpointer*` events to avoid duplicate execution.

### ➕ BUG-002: Mobile Adding Task
- **Floating Controls**: Added a mobile-optimized footer with a primary "+" button to trigger the Quick Add modal.
- **UI Enhancements**: The footer is sticky and uses high-contrast buttons for better accessibility on small screens.

### 📤 BUG-003: Mobile Exporting
- **Native Clipboard API**: Switched from `navigator.clipboard` to Obsidian's more robust `app.copyToClipboard` internal API to ensure compatibility across mobile OS versions.
- **Export Control**: Added an export button to the new mobile footer for easy access.

## Verification Results

### Automated Tests
- **E2E Pass**: Reordering via drag handles is verified and stable.
- **E2E Stability**: Reordering via card body is improved, preventing accidental task deletion/archiving (swipe conflicts).

### Manual Verification Path
1. Open Todo Flow on mobile.
2. Long-press a task card and drag it vertically; it should lock into reorder mode.
3. Tap the "+" button in the footer to open the Quick Add modal.
4. Tap the Export button to copy the stack to the clipboard.

render_diffs(file:///Users/i525277/github/obsidian_plugin_for_todo_flow/src/views/StackView.svelte)
render_diffs(file:///Users/i525277/github/obsidian_plugin_for_todo_flow/src/services/StackPersistenceService.ts)
render_diffs(file:///Users/i525277/github/obsidian_plugin_for_todo_flow/src/views/StackView.ts)
