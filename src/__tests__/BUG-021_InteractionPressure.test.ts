import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProcessGovernor } from '../services/ProcessGovernor';

describe('BUG-021: Interaction Pressure', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should trigger high pressure when an interaction is claimed and maintain for cooldown', () => {
        const mockApp = {} as any;
        const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
        const governor = ProcessGovernor.getInstance(mockApp, mockLogger);

        // Reset state
        (governor as any).interactionCount = 0;
        (governor as any).lastInteractionEndTime = 0;

        expect(governor.isHighPressure()).toBe(false);

        governor.claimInteraction();
        expect(governor.isHighPressure()).toBe(true);
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('UI Interaction START'));

        governor.releaseInteraction();
        // Should STILL be high pressure due to cooldown period
        expect(governor.isHighPressure()).toBe(true);
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('UI Interaction END'));

        // Advance 500ms - should now be clear (500ms is the new threshold)
        vi.advanceTimersByTime(500);
        expect(governor.isHighPressure()).toBe(false);
    });

    it('should handle nested interactions correctly', () => {
        const mockApp = {} as any;
        const governor = ProcessGovernor.getInstance(mockApp);
        (governor as any).interactionCount = 0;
        (governor as any).lastInteractionEndTime = 0;

        governor.claimInteraction();
        governor.claimInteraction();
        expect(governor.isHighPressure()).toBe(true);

        governor.releaseInteraction();
        expect(governor.isHighPressure()).toBe(true); // Still one active interaction

        governor.releaseInteraction();
        expect(governor.isHighPressure()).toBe(true); // No active, but in cooldown

        vi.advanceTimersByTime(1001);
        expect(governor.isHighPressure()).toBe(false); // Cooldown expired
    });
});
