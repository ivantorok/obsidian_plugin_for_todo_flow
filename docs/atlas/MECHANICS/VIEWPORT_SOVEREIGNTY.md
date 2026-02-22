# Primitive: Viewport Sovereignty

Defines how the UI behaves when the viewport shift occurs, typically triggered by a virtual keyboard on mobile.

## The "Editing Buffer" Pattern
- **Problem**: Virtual keyboards occlude inputs at the bottom of the screen. `scrollIntoView` fails if the item is already at the bottom of the content container.
- **Solution**: Inject a dynamic `min-height: 50vh` or `padding-bottom: 50vh` element to the bottom of the container while ANY input is focused.
- **Usage**: 
    - `[[DUMP]]` uses this to keep the "done" trigger visible.
    - `[[STACK]]` uses this for title renaming.

## Virtual Keyboard Layout Shift (VKLS)
- All interactive inputs MUST use a central `ViewportService` (if implemented) or follow the CSS `safe-area-inset` rules to handle shift.
- Standard `focus()` is forbidden in high-stress mobile views without an accompanying scroll action.
- **Session v4 Focus Preservation**: Container sovereignty is maintained post-edit via `requestAnimationFrame` focus restoration to prevent Obsidian from swallowing focus after input blur.
- **Adaptive Padding**: Containers must shrink bottom padding (e.g. `40vh`) during editing to prevent ghost scroll space while still clearing the keyboard.
