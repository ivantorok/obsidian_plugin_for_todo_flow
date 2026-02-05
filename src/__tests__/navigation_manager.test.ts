import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NavigationManager } from '../navigation/NavigationManager.js';
import { type TaskNode } from '../scheduler.js';
import { type StackLoader } from '../loaders/StackLoader.js';
import { type StackPersistenceService } from '../services/StackPersistenceService.js';

// Mock Obsidian
vi.mock('obsidian', () => ({
    TFile: class { path: string = ''; },
    EventRef: class { }
}));

import { TFile } from 'obsidian';

describe('NavigationManager - Basic Stack Management', () => {
    let navManager: NavigationManager;
    let mockLoader: any;
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
            isExternalUpdate: vi.fn().mockReturnValue(true)
        };
        navManager = new NavigationManager(mockApp as any, mockLoader as any as StackLoader, mockPersistence as any as StackPersistenceService);
    });

    it('should register a watcher on metadataCache during construction', () => {
        expect(mockApp.metadataCache.on).toHaveBeenCalledWith('changed', expect.any(Function));
    });

    it('should set initial stack from source', () => {
        // Arrange
        const tasks: TaskNode[] = [
            { id: 'task1.md', title: 'Task 1', duration: 30, status: 'todo', isAnchored: false, children: [] },
            { id: 'task2.md', title: 'Task 2', duration: 45, status: 'todo', isAnchored: false, children: [] }
        ];

        // Act
        navManager.setStack(tasks, 'parent.md');

        // Assert
        const currentStack = navManager.getCurrentStack();
        expect(currentStack).toHaveLength(2);
        expect(currentStack[0]!.id).toBe('task1.md');
        expect(currentStack[1]!.id).toBe('task2.md');
    });

    it('should get current stack', () => {
        // Arrange
        const tasks: TaskNode[] = [
            { id: 'task1.md', title: 'Task 1', duration: 30, status: 'todo', isAnchored: false, children: [] }
        ];
        navManager.setStack(tasks, 'source.md');

        // Act
        const stack = navManager.getCurrentStack();

        // Assert
        expect(stack).toHaveLength(1);
        expect(stack[0]!.title).toBe('Task 1');
    });

    it('should return empty array when no stack is set', () => {
        // Act
        const stack = navManager.getCurrentStack();

        // Assert
        expect(stack).toHaveLength(0);
    });

    it('should clear all navigation state', () => {
        // Arrange
        const tasks: TaskNode[] = [
            { id: 'task1.md', title: 'Task 1', duration: 30, status: 'todo', isAnchored: false, children: [] }
        ];
        navManager.setStack(tasks, 'source.md');

        // Act
        navManager.clear();

        // Assert
        const stack = navManager.getCurrentStack();
        expect(stack).toHaveLength(0);

        const state = navManager.getState();
        expect(state.currentStack).toHaveLength(0);
        expect(state.history).toHaveLength(0);
        expect(state.currentSource).toBe('');
    });

    it('should store source path when setting stack', () => {
        // Arrange
        const tasks: TaskNode[] = [
            { id: 'task1.md', title: 'Task 1', duration: 30, status: 'todo', isAnchored: false, children: [] }
        ];

        // Act
        navManager.setStack(tasks, 'my-source.md');

        // Assert
        const state = navManager.getState();
        expect(state.currentSource).toBe('my-source.md');
    });

    it('should refresh when an external update is detected for the current source', async () => {
        // Arrange
        const tasks: TaskNode[] = [{ id: 'task1.md', title: 'Task 1', duration: 30, status: 'todo', isAnchored: false, children: [] }];
        navManager.setStack(tasks, 'source.md');

        const watcherCallback = mockApp.metadataCache.on.mock.calls[0][1];
        const mockFile = new TFile();
        mockFile.path = 'source.md';

        mockLoader.load.mockResolvedValue([
            { id: 'task1.md', title: 'Task 1 Updated', duration: 30, status: 'todo', isAnchored: false, children: [] }
        ]);

        // Act
        await watcherCallback(mockFile);

        // Assert
        expect(mockPersistence.isExternalUpdate).toHaveBeenCalledWith('source.md');
        expect(mockLoader.load).toHaveBeenCalledWith('source.md');
        expect(navManager.getCurrentStack()[0]!.title).toBe('Task 1 Updated');
    });
});
