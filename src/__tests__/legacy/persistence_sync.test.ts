import { describe, it, expect, vi } from 'vitest';
import { StackController } from '../views/StackController.js';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';

describe('Stack-to-Note Persistence Sync', () => {
    const now = moment('2026-01-25 08:00');

    it('should call onTaskUpdate when duration is scaled', () => {
        const onTaskUpdate = vi.fn();
        const initialTasks: TaskNode[] = [
            { id: 'path/to/note.md', title: 'Test Task', duration: 30, status: 'todo', isAnchored: false, children: [] }
        ];

        const controller = new StackController(initialTasks, now, onTaskUpdate);

        // Scale duration up
        controller.scaleDuration(0, 'up');

        // Should have updated to 45m (based on DURATION_SEQUENCE)
        expect(onTaskUpdate).toHaveBeenCalledWith(expect.objectContaining({
            id: 'path/to/note.md',
            duration: 45
        }));
    });

    it('should call onTaskUpdate when status is changed', () => {
        const onTaskUpdate = vi.fn();
        const initialTasks: TaskNode[] = [
            { id: 'path/to/note.md', title: 'Test Task', duration: 30, status: 'todo', isAnchored: false, children: [] }
        ];

        const controller = new StackController(initialTasks, now, onTaskUpdate);

        // Mark as done
        controller.toggleStatus(0);

        expect(onTaskUpdate).toHaveBeenCalledWith(expect.objectContaining({
            id: 'path/to/note.md',
            status: 'done'
        }));
    });

    it('should call onTaskUpdate when anchor is toggled', () => {
        const onTaskUpdate = vi.fn();
        const initialTasks: TaskNode[] = [
            { id: 'path/to/note.md', title: 'Test Task', duration: 30, status: 'todo', isAnchored: false, children: [] }
        ];

        const controller = new StackController(initialTasks, now, onTaskUpdate);

        controller.toggleAnchor(0);

        expect(onTaskUpdate).toHaveBeenCalledWith(expect.objectContaining({
            id: 'path/to/note.md',
            isAnchored: true
        }));
    });

    it('should call onTaskCreate when task is added', () => {
        const onTaskUpdate = vi.fn();
        const onTaskCreate = vi.fn().mockImplementation((title) => ({
            id: 'new-path.md', title, duration: 30, status: 'todo', isAnchored: false, children: []
        }));

        const initialTasks: TaskNode[] = [
            { id: 'path/to/note.md', title: 'Task 1', duration: 30, status: 'todo', isAnchored: false, children: [] }
        ];

        const controller = new StackController(initialTasks, now, onTaskUpdate, onTaskCreate);

        controller.addTaskAt(0, 'New Task');

        expect(onTaskCreate).toHaveBeenCalledWith('New Task');
        expect(controller.getTasks()[0]!.title).toBe('Task 1');
        expect(controller.getTasks()[1]!.title).toBe('New Task');
    });
});
