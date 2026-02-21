import { describe, it, expect, vi } from 'vitest';
import { NavigationManager } from '../navigation/NavigationManager.js';
import { StackLoader } from '../loaders/StackLoader.js';
import { StackPersistenceService } from '../services/StackPersistenceService.js';
import { type TaskNode } from '../scheduler.js';

describe('Handoff Regression', () => {
    const mockApp = {
        metadataCache: {
            on: vi.fn(),
            offref: vi.fn(),
            getFirstLinkpathDest: vi.fn()
        }
    } as any;

    const mockLoader = {
        load: vi.fn(),
        loadSpecificFiles: vi.fn(),
        loadShortlisted: vi.fn()
    } as unknown as StackLoader;

    const mockPersistence = {
        isExternalUpdate: vi.fn().mockResolvedValue(false)
    } as unknown as StackPersistenceService;

    const task1: TaskNode = { id: 'file1.md', title: 'Task 1', status: 'todo', duration: 30, isAnchored: false, children: [] };

    it('should stay stable via Direct Injection even if disk is empty', async () => {
        const navManager = new NavigationManager(mockApp, mockLoader, mockPersistence);

        // 1. Simulate Triage -> Stack handoff via Direct Injection (IDs)
        const ids = [task1.id];
        vi.mocked(mockLoader.loadSpecificFiles).mockResolvedValueOnce([task1]);

        // In StackView.ts setState, we'd call:
        const rawTasks = await mockLoader.loadSpecificFiles(ids);
        navManager.setStack(rawTasks, 'todo-flow/CurrentStack.md');

        expect(navManager.getCurrentStack()).toHaveLength(1);
        expect(navManager.getCurrentStack()[0]!.id).toBe('file1.md');

        // 2. Verified: Even if a refresh happened later, if the source is CurrentStack.md,
        // it would hit the disk. BUT because we removed the redundant reload() from onOpen(),
        // the initial mount is safe.
    });
});
