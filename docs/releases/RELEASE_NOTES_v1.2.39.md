# Walkthrough: Mobile Interaction Fixes (BUG-011 & BUG-016)

I have successfully addressed two major mobile interaction issues: Keyboard Collision (BUG-016) and Card Body Drag (BUG-011). Both fixes have been verified with automated E2E tests.

## Changes Made

### BUG-016: Mobile Keyboard Collision
This issue caused the virtual keyboard or "ghost space" to obscure input fields during task renaming on mobile.
- **Viewport Hardening**: Modified `ViewportService.ts` to support specific scroll alignment (`block: 'start'`).
- **Dynamic Padding**: Reduced the `.is-editing` container padding from `50vh` to `40vh` to prevent the keyboard from pushing inputs off-screen.
- **Top Alignment**: Forced the rename input to scroll to the top of the viewport on mobile, keeping it visible above the keyboard.

### BUG-011: Mobile Card Body Drag
Reordering tasks on mobile was difficult because it required precision on the drag handle.
- **Relaxed Intent Threshold**: Changed the drag-locking threshold from `dy > dx * 1.2` to `dy > dx`, making it easier to trigger dragging even with "sloppy" or diagonal motions.
- **Smarter Touch Blocking**: Aligned the `handleTouchBlocking` threshold (from `10px` down to `2px`) with the pointer move logic, improving responsiveness and preventing the browser from taking over for scrolling when a drag is intended.

## Verification Results

### Automated Tests
Both issues were verified using dedicated E2E journey tests simulating mobile environments.

````carousel
```typescript
// tests/e2e/journeys/mobile_keyboard_collision.spec.ts
it('should handle "ghost space" by keeping input visible during rename', async () => {
    // Verified input remains in top 40% of screen above keyboard
});
```
<!-- slide -->
```typescript
// tests/e2e/journeys/BUG-011_reordering.spec.ts
it('should reorder tasks via touch drag and drop on card body (BUG-011 REPRO - SLOPPY DRAG)', async () => {
    // Verified reordering works even with imperfect diagonal touch swipes
});
```
````

| ID | Status | Test File |
| :--- | :--- | :--- |
| BUG-016 | **PASS** | `mobile_keyboard_collision.spec.ts` |
| BUG-011 | **PASS** | `BUG-011_reordering.spec.ts` |
| MG-01/02| **PASS** | `verification_mg.spec.ts` |
| MG-03   | **PASS** | `verification_mg.spec.ts` |

### Gesture Refinement (Swipe/Archive Fix)
Verified that Swipe Left (Archive) now persists correctly to the Markdown note via the `flow_state` field. Test isolation has also been improved by adding `beforeEach` setup to the gesture spec.

The `QA_CHECKLIST.md` has been updated to reflect these passes.
