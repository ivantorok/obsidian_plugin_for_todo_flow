import { describe, it, expect } from 'vitest';
import { LoopManager } from '../services/LoopManager.js';

describe('LoopManager', () => {
    describe('resolveNextIndex', () => {
        it('should move to next index if not at the end', () => {
            const result = LoopManager.resolveNextIndex(0, 3, true);
            expect(result.nextIndex).toBe(1);
            expect(result.showVictory).toBe(false);
        });

        it('should show victory lap when at the end and loop is enabled', () => {
            const result = LoopManager.resolveNextIndex(2, 3, true);
            expect(result.nextIndex).toBe(2);
            expect(result.showVictory).toBe(true);
        });

        it('should NOT show victory lap when at the end and loop is disabled', () => {
            const result = LoopManager.resolveNextIndex(2, 3, false);
            expect(result.nextIndex).toBe(2);
            expect(result.showVictory).toBe(false);
        });

        it('should handle zero items gracefully', () => {
            const result = LoopManager.resolveNextIndex(0, 0, true);
            expect(result.nextIndex).toBe(0);
            expect(result.showVictory).toBe(false);
        });
    });

    describe('restartLoop', () => {
        it('should return 0', () => {
            expect(LoopManager.restartLoop()).toBe(0);
        });
    });
});
