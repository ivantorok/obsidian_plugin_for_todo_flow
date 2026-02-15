import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StackPersistenceService } from '../services/StackPersistenceService.js';

describe('Watcher Silence (Sovereign Handoff)', () => {
    let service: StackPersistenceService;
    const mockApp = {
        vault: {
            getAbstractFileByPath: vi.fn(),
            modify: vi.fn(),
            create: vi.fn(),
            adapter: {
                exists: vi.fn(),
                mkdir: vi.fn()
            }
        }
    } as any;

    beforeEach(() => {
        service = new StackPersistenceService(mockApp);
        vi.useFakeTimers();
    });

    it('should reject external updates when silenced', () => {
        service.recordInternalWrite('test.md');

        // Fast forward 3 seconds (normally external)
        vi.advanceTimersByTime(3000);
        expect(service.isExternalUpdate('test.md')).toBe(true);

        // Silence for 1 second
        service.silence(1000);

        // Still true for a moment because of how Date.now() works with fake timers? 
        // Let's ensure fake timers are used for Date.now too.
        expect(service.isExternalUpdate('test.md')).toBe(false);

        // Advance 500ms (still silenced)
        vi.advanceTimersByTime(500);
        expect(service.isExternalUpdate('test.md')).toBe(false);

        // Advance another 600ms (silence expired)
        vi.advanceTimersByTime(600);
        expect(service.isExternalUpdate('test.md')).toBe(true);
    });

    it('should respect the custom silence duration', () => {
        service.recordInternalWrite('test.md');
        vi.advanceTimersByTime(3000);

        service.silence(5000);
        expect(service.isExternalUpdate('test.md')).toBe(false);

        vi.advanceTimersByTime(4000);
        expect(service.isExternalUpdate('test.md')).toBe(false);

        vi.advanceTimersByTime(1100);
        expect(service.isExternalUpdate('test.md')).toBe(true);
    });
});
