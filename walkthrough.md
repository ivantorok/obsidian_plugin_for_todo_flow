# Walkthrough: BUG-017 Gesture Shadowing Fix

I have resolved the "Competitive Swiper" issue where Obsidian mobile system gestures (sidebars) were interfering with task card swipes.

## 1. Problem Identification
The root cause was that `handlePointerMove` in `StackView.svelte` was only calling `e.stopPropagation()` after a 20px horizontal threshold. This allowed Obsidian to see and react to the initial movement of a swipe gesture.

## 2. Changes Made
- Updated `handlePointerMove` to call `e.stopPropagation()` and `e.stopImmediatePropagation()` at the very top of the function if a swiping or dragging intent is already present.
- Added `e.stopImmediatePropagation()` to `ontouchstart` and `handleTouchBlocking` for consistent shadowing across all touch-related events.
- Refined thresholds to ensure the plugin "locks" the gesture before Obsidian can claim it.

## 3. Verification Results

### Automated Tests
- **Unit Tests**: `StackViewMobileGestures.test.ts` passed (4/4).
- **Golden Suite**: `npm run test:quick` passed (10/10 journey tests).
- **Regression Test**: `BUG-017_gesture_shadowing.spec.ts` passed (Verified that `touchmove` events are correctly shadowed).

### Manual Verification
- Simulated 150px swipes in the E2E environment.
- Confirmed that `handleTouchBlocking` is entered and `stopPropagation` is called immediately.

---
**Verified by**: Antigravity
**Date**: 2026-02-09
**Status**: Ready to Ship 🚀
