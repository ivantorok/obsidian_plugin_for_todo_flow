import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessGovernor, PressureLevel } from '../services/ProcessGovernor';

describe('ProcessGovernor Interaction Tracking', () => {
    let app: any;
    let governor: ProcessGovernor;

    beforeEach(() => {
        app = {};
        // Reset singleton for clean testing
        (ProcessGovernor as any).instance = undefined;
        governor = ProcessGovernor.getInstance(app);
    });

    it('should report high pressure when interaction is claimed', () => {
        expect(governor.isHighPressure()).toBe(false);
        
        governor.claimInteraction();
        expect(governor.isHighPressure()).toBe(true);
        
        governor.releaseInteraction();
        // Cooldown period (500ms)
        expect(governor.isHighPressure()).toBe(true);
    });

    it('should return to normal pressure after cooldown', async () => {
        governor.claimInteraction();
        governor.releaseInteraction();
        
        // Wait for cooldown
        await new Promise(resolve => setTimeout(resolve, 600));
        expect(governor.isHighPressure()).toBe(false);
    });

    it('should respect multiple interactions (nested/concurrent)', () => {
        governor.claimInteraction(); // count 1
        governor.claimInteraction(); // count 2
        
        governor.releaseInteraction(); // count 1
        expect(governor.isHighPressure()).toBe(true);
        
        governor.releaseInteraction(); // count 0
        // Still in cooldown
        expect(governor.isHighPressure()).toBe(true);
    });
});
