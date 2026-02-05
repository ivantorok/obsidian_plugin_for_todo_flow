
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { NavigationManager } from '../navigation/NavigationManager.js';
import { StackLoader } from '../loaders/StackLoader.js';
import { type StackPersistenceService } from '../services/StackPersistenceService.js';
import type { TaskNode } from '../scheduler.js';

describe('NavigationManager - Explicit Mode (TDD)', () => {
    let manager: NavigationManager;
    let mockLoader: any;
    let mockApp: any;
    let mockPersistence: any;

    beforeEach(() => {
        // Mock the loader
        mockLoader = {
            load: vi.fn().mockResolvedValue([]),
            loadSpecificFiles: vi.fn().mockResolvedValue([]),
            loadShortlisted: vi.fn().mockResolvedValue([])
        };
        mockApp = {
            metadataCache: {
                on: vi.fn(),
                offref: vi.fn()
            }
        };
        mockPersistence = {
            isExternalUpdate: vi.fn().mockReturnValue(true)
        };
        manager = new NavigationManager(mockApp as any, mockLoader as unknown as StackLoader, mockPersistence as any as StackPersistenceService);
    });

    test('goBack should reload SPECIFIC FILES when previous source was EXPLICIT', async () => {
        // 1. Setup Initial Stack (Explicit Mode / Tray)
        const rootTasks: TaskNode[] = [
            { id: 'task1.md', title: 'Task 1', duration: 30, isAnchored: false, status: 'todo', children: [] },
            { id: 'task2.md', title: 'Task 2', duration: 30, isAnchored: false, status: 'todo', children: [] }
        ];

        // We set the stack manually to simulate "Active Tray" loaded by StackView
        manager.setStack(rootTasks, 'EXPLICIT:2');

        // 2. Drill Down into Task 1
        // Mock load returning children
        const children: TaskNode[] = [
            { id: 'child1.md', title: 'Child 1', duration: 15, isAnchored: false, status: 'todo', children: [] }
        ];
        mockLoader.load.mockResolvedValueOnce(children);

        const success = await manager.drillDown('task1.md', 0);
        expect(success).toBe(true);

        // Verify state is now deep
        expect(manager.getState().currentSource).toBe('task1.md');
        expect(manager.getState().history.length).toBe(1);

        // 3. Go Back
        // Crucial Step: We mock loadSpecificFiles to return refreshed root tasks
        // This simulates that task metadata might have changed (e.g. time spent)
        const refreshedRootTasks = [...rootTasks];
        if (refreshedRootTasks[0]) refreshedRootTasks[0].duration = 45; // Moved or changed
        mockLoader.loadSpecificFiles.mockResolvedValueOnce(refreshedRootTasks);

        const result = await manager.goBack();

        // 4. Assertions
        expect(result.success).toBe(true);
        expect(result.focusedIndex).toBe(0);

        // CHECK FIX: Did it call loadSpecificFiles with the IDs from history?
        // It should NOT call load('EXPLICIT:2') because that would fail in real app
        expect(mockLoader.loadSpecificFiles).toHaveBeenCalledWith(['task1.md', 'task2.md']);

        // Ensure state is restored
        const stack = manager.getState().currentStack;
        if (stack[0]) {
            expect(stack[0].duration).toBe(45); // It used the refreshed value
        }
        expect(manager.getState().currentSource).toBe('EXPLICIT:2');
        expect(manager.getState().history.length).toBe(0);
    });

    test('goBack should default to standard load for non-explicit sources', async () => {
        // Setup standard folder stack
        const rootTasks: TaskNode[] = [{ id: 'taskA.md', title: 'A', duration: 10, isAnchored: false, status: 'todo', children: [] }];
        manager.setStack(rootTasks, 'folder/path');

        mockLoader.load.mockResolvedValueOnce([{ id: 'childA.md', title: 'Child', duration: 5, isAnchored: false, status: 'todo', children: [] }]);
        await manager.drillDown('taskA.md', 0);

        // Go back
        mockLoader.load.mockResolvedValueOnce(rootTasks);
        await manager.goBack();

        // Should call standard load
        expect(mockLoader.load).toHaveBeenCalledTimes(2); // Once for drillDown child, once for goBack parent
        expect(mockLoader.load).toHaveBeenLastCalledWith('folder/path');
        expect(mockLoader.loadSpecificFiles).not.toHaveBeenCalled();
    });
});
