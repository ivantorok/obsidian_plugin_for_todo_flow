import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NavigationManager } from '../navigation/NavigationManager.js';
import { type TaskNode } from '../scheduler.js';
import { type StackLoader } from '../loaders/StackLoader.js';

describe('NavigationManager - Basic Stack Management', () => {
    let navManager: NavigationManager;
    let mockLoader: any;

    beforeEach(() => {
        mockLoader = {
            load: vi.fn()
        };
        navManager = new NavigationManager(mockLoader as any as StackLoader);
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
});
