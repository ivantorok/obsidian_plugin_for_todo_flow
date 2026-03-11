import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InteractionIdleQueue } from '../services/InteractionIdleQueue.js';
import { ProcessGovernor } from '../services/ProcessGovernor.js';
import { type App } from 'obsidian';

vi.mock('../services/ProcessGovernor.js', () => {
    return {
        ProcessGovernor: {
            getInstance: vi.fn()
        }
    };
});

describe('InteractionIdleQueue', () => {
    let mockApp: App;
    let mockGovernor: any;
    let queue: InteractionIdleQueue;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        mockApp = {} as App;
        mockGovernor = {
            isHighPressure: vi.fn().mockReturnValue(false)
        };
        (ProcessGovernor.getInstance as any).mockReturnValue(mockGovernor);

        // Reset singleton
        InteractionIdleQueue.resetInstance();
        queue = InteractionIdleQueue.getInstance(mockApp);
    });

    it('should execute save immediately (after debounce) if pressure is low', async () => {
        const saveFn = vi.fn().mockResolvedValue(undefined);
        queue.push({ filePath: 'test.md', saveFn });

        // Fast-forward debounce (250ms)
        vi.advanceTimersByTime(300);
        // Wait for microtask (chained promise)
        await Promise.resolve();
        await Promise.resolve();

        expect(saveFn).toHaveBeenCalledTimes(1);
    });

    it('should buffer saves if pressure is high', async () => {
        const saveFn = vi.fn().mockResolvedValue(undefined);
        mockGovernor.isHighPressure.mockReturnValue(true);

        queue.push({ filePath: 'test.md', saveFn });

        // Fast-forward debounce (1000ms)
        vi.advanceTimersByTime(1100);
        await Promise.resolve();

        expect(saveFn).not.toHaveBeenCalled();

        // Release pressure and wait for next check
        mockGovernor.isHighPressure.mockReturnValue(false);
        vi.advanceTimersByTime(1100);
        await Promise.resolve();
        await Promise.resolve();

        expect(saveFn).toHaveBeenCalledTimes(1);
    });

    it('should de-duplicate requests for the same file', async () => {
        const saveFn1 = vi.fn().mockResolvedValue(undefined);
        const saveFn2 = vi.fn().mockResolvedValue(undefined);

        queue.push({ filePath: 'test.md', saveFn: saveFn1 });
        queue.push({ filePath: 'test.md', saveFn: saveFn2 });

        vi.advanceTimersByTime(300);
        await Promise.resolve();
        await Promise.resolve();

        expect(saveFn1).not.toHaveBeenCalled();
        expect(saveFn2).toHaveBeenCalledTimes(1);
    });

    it('should force flush immediately', async () => {
        const saveFn = vi.fn().mockResolvedValue(undefined);
        queue.push({ filePath: 'test.md', saveFn });

        await queue.forceFlush();

        expect(saveFn).toHaveBeenCalledTimes(1);
    });

    it('should handle immediate flag', async () => {
        const saveFn = vi.fn().mockResolvedValue(undefined);
        await queue.push({ filePath: 'test.md', saveFn }, true);

        // No timer advance needed for immediate flush
        expect(saveFn).toHaveBeenCalledTimes(1);
    });
});
