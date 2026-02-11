import { describe, it, expect, vi } from 'vitest';
import { resolveSwipe, isDoubleTap } from '../gestures.js';

/**
 * Mobile Gesture Logic for Stack View
 */
describe('Stack View Mobile Gestures (TDD)', () => {

    describe('Swipe Logic', () => {
        it('should resolve right swipe as "right"', () => {
            expect(resolveSwipe(100)).toBe('right');
        });

        it('should resolve left swipe as "left"', () => {
            expect(resolveSwipe(-100)).toBe('left');
        });

        it('should resolve small movements as "none"', () => {
            expect(resolveSwipe(30)).toBe('none');
            expect(resolveSwipe(-30)).toBe('none');
        });
    });

    describe('Double Tap Logic', () => {
        it('should detect double tap within the window', () => {
            expect(isDoubleTap(1000, 1200)).toBe(true);
        });

        it('should not detect double tap outside the window', () => {
            expect(isDoubleTap(1000, 1500)).toBe(false);
        });
    });
});
