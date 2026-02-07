# BUG-011: Mobile Card Body Drag-and-Drop Not Working

## Problem / Goal
On mobile, dragging a task card by its body (center area) does not trigger reordering. Only dragging by the handle works. The card body should be draggable for better UX.

## Current Behavior
- **Drag by handle**: ✅ Works correctly - tasks reorder as expected
- **Drag by card body**: ❌ Fails - tasks do not reorder, no visual feedback

## Expected Behavior
Users should be able to drag and drop tasks by grabbing anywhere on the card body, not just the handle. This provides a larger touch target and better mobile UX.

## Evidence
Test: `tests/e2e/mobile_reordering.spec.ts`
- Test "should reorder tasks via touch drag and drop on handles" - **PASSES**
- Test "should reorder tasks via touch drag and drop on card body" - **FAILS**

Error:
```
expect(received).toEqual(expected)
  Array [
-   "Card 2",
    "Card 1",
+   "Card 2",
  ]
```

The cards remain in their original order when dragged by the body.

## Proposed Solution
1. Investigate touch event handlers in `StackView.svelte`
2. Ensure card body has proper drag event listeners for mobile
3. Verify mobile gesture isolation doesn't block card body dragging
4. Update or remove the handle-only drag test

## Related Files
- `src/views/StackView.svelte` - Main view with drag-and-drop logic
- `tests/e2e/mobile_reordering.spec.ts` - Test file
- `tests/e2e/mobile_gestures.spec.ts` - Related mobile gesture tests

## Priority
Medium - Affects mobile UX but handle dragging works as a workaround.

## Notes
- This was discovered during E2E test stabilization work
- The test failure is consistent (not flaky)
- Desktop drag-and-drop works correctly for both handle and card body
