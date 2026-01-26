import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NavigationManager } from '../navigation/NavigationManager.js';
import { type TaskNode } from '../scheduler.js';
import { type StackLoader } from '../loaders/StackLoader.js';

describe('NavigationManager - Drill Down', () => {
    let navManager: NavigationManager;
    let mockLoader: any;

    beforeEach(() => {
        mockLoader = {
            load: vi.fn()
        };
        navManager = new NavigationManager(mockLoader as any as StackLoader);
    });

    it('should drill down into task with children', async () => {
        // Arrange
        const initialTasks: TaskNode[] = [
            { id: 'parent.md', title: 'Parent', duration: 30, status: 'todo', isAnchored: false, children: [] }
        ];
        navManager.setStack(initialTasks, 'root.md');

        const childTasks: TaskNode[] = [
            { id: 'child.md', title: 'Child', duration: 15, status: 'todo', isAnchored: false, children: [] }
        ];
        mockLoader.load.mockResolvedValue(childTasks);

        // Act
        const success = await navManager.drillDown('parent.md', 0);

        // Assert
        expect(success).toBe(true);
        expect(navManager.getCurrentStack()).toEqual(childTasks);
    });

    it('should push current stack to history when drilling down', async () => {
        // Arrange
        const tasks: TaskNode[] = [{ id: 't1', title: 'T1', duration: 30, status: 'todo', isAnchored: false, children: [] }];
        navManager.setStack(tasks, 'root.md');
        mockLoader.load.mockResolvedValue([{ id: 'child', title: 'Child', duration: 10, status: 'todo', isAnchored: false, children: [] }]);

        // Act
        await navManager.drillDown('t1', 0);

        // Assert
        expect(navManager.canGoBack()).toBe(true);
    });

    it('should return false when drilling into task with no children', async () => {
        // Arrange
        const tasks: TaskNode[] = [{ id: 't1', title: 'T1', duration: 30, status: 'todo', isAnchored: false, children: [] }];
        navManager.setStack(tasks, 'root.md');
        mockLoader.load.mockResolvedValue([]); // No children found by loader

        // Act
        const success = await navManager.drillDown('t1', 0);

        // Assert
        expect(success).toBe(false);
    });

    it('should update current source when drilling down', async () => {
        // Arrange
        const tasks: TaskNode[] = [{ id: 'parent.md', title: 'Parent', duration: 30, status: 'todo', isAnchored: false, children: [] }];
        navManager.setStack(tasks, 'root.md');
        mockLoader.load.mockResolvedValue([{ id: 'child', title: 'Child', duration: 10, status: 'todo', isAnchored: false, children: [] }]);

        // Act
        await navManager.drillDown('parent.md', 0);

        // Assert
        const state = navManager.getState();
        expect(state.currentSource).toBe('parent.md');
    });
});
