import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NavigationManager } from '../navigation/NavigationManager.js';
import { type StackLoader } from '../loaders/StackLoader.js';
import { type StackPersistenceService } from '../services/StackPersistenceService.js';

describe('NavigationManager - Refresh on Go Back', () => {
    let mockLoader: any;
    let navManager: NavigationManager;
    let mockApp: any;
    let mockPersistence: any;

    beforeEach(() => {
        mockLoader = {
            load: vi.fn(),
            loadSpecificFiles: vi.fn(),
            loadShortlisted: vi.fn()
        };
        mockApp = {
            metadataCache: {
                on: vi.fn(),
                offref: vi.fn()
            }
        };
        mockPersistence = {
            isExternalUpdate: vi.fn().mockResolvedValue(true)
        };
        navManager = new NavigationManager(mockApp as any, mockLoader as any as StackLoader, mockPersistence as any as StackPersistenceService);
    });

    it('should refresh the stack when going back to reflect metadata changes', async () => {
        // 1. Initial stack
        const initialTasks: any[] = [
            { id: 'child1.md', title: 'Child 1', duration: 30, status: 'todo', isAnchored: false, children: [] }
        ];
        navManager.setStack(initialTasks, 'parent.md');

        // 2. Setup mock for Drill Down
        mockLoader.load.mockResolvedValueOnce([
            { id: 'subtask.md', title: 'Subtask', duration: 30, status: 'todo', isAnchored: false, children: [] }
        ]);
        await navManager.drillDown('child1.md', 0);

        // 3. Setup mock for Go Back (refreshed parent)
        const updatedTasks: any[] = [
            { id: 'child1.md', title: 'Child 1', duration: 45, status: 'todo', isAnchored: false, children: [] }
        ];
        mockLoader.load.mockResolvedValueOnce(updatedTasks);

        // 4. Go back
        const result = await navManager.goBack();

        expect(result.success).toBe(true);
        expect(navManager.getCurrentStack()[0]!.duration).toBe(45);
        expect(mockLoader.load).toHaveBeenCalledWith('parent.md');
    });
});
