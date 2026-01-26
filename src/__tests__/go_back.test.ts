import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NavigationManager } from '../navigation/NavigationManager.js';
import { type TaskNode } from '../scheduler.js';
import { type StackLoader } from '../loaders/StackLoader.js';

describe('NavigationManager - Go Back with Focus', () => {
    let navManager: NavigationManager;
    let mockLoader: any;

    beforeEach(() => {
        mockLoader = {
            load: vi.fn()
        };
        navManager = new NavigationManager(mockLoader as any as StackLoader);
    });

    it('should go back to previous stack and restore focus', async () => {
        // Arrange: Level A
        const levelA: TaskNode[] = [
            { id: 'a.md', title: 'A', duration: 30, status: 'todo', isAnchored: false, children: [] },
            { id: 'b.md', title: 'B', duration: 20, status: 'todo', isAnchored: false, children: [] }
        ];
        navManager.setStack(levelA, 'root.md');

        // Drill down into B (index 1)
        const levelB: TaskNode[] = [
            { id: 'c.md', title: 'C', duration: 10, status: 'todo', isAnchored: false, children: [] }
        ];
        mockLoader.load.mockResolvedValueOnce(levelB);
        await navManager.drillDown('b.md', 1);

        // Act: Go back
        mockLoader.load.mockResolvedValueOnce(levelA);
        const result = await navManager.goBack();

        // Assert
        expect(result.success).toBe(true);
        expect(result.focusedIndex).toBe(1);
        expect(navManager.getCurrentStack()).toHaveLength(2);
        expect(navManager.getCurrentStack()[1]!.id).toBe('b.md');
    });

    it('should return success false and index 0 at root', async () => {
        navManager.setStack([], 'root.md');
        const result = await navManager.goBack();
        expect(result.success).toBe(false);
        expect(result.focusedIndex).toBe(0);
    });
});
