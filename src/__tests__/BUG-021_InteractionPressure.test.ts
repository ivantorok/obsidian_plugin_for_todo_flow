import { describe, it, expect, vi } from 'vitest';
import { ProcessGovernor } from '../services/ProcessGovernor';

describe('BUG-021: Interaction Pressure', () => {
    it('should trigger high pressure when an interaction is claimed', () => {
        const mockApp = {} as any;
        const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
        const governor = ProcessGovernor.getInstance(mockApp, mockLogger);

        // Reset state if singleton was already contaminated
        while (governor.isHighPressure()) {
            governor.releaseInteraction();
            if (!(performance as any).memory) break; // If memory is actually high, we can't test this purely
        }

        expect(governor.isHighPressure()).toBe(false);

        governor.claimInteraction();
        expect(governor.isHighPressure()).toBe(true);
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('UI Interaction START'));

        governor.releaseInteraction();
        expect(governor.isHighPressure()).toBe(false);
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('UI Interaction END'));
    });

    it('should handle nested interactions', () => {
        const mockApp = {} as any;
        const governor = ProcessGovernor.getInstance(mockApp);

        governor.claimInteraction();
        governor.claimInteraction();
        expect(governor.isHighPressure()).toBe(true);

        governor.releaseInteraction();
        expect(governor.isHighPressure()).toBe(true); // Still one active

        governor.releaseInteraction();
        expect(governor.isHighPressure()).toBe(false); // All clear
    });
});
