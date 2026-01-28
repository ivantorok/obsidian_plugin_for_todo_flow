import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RenameTaskCommand } from '../commands/stack-commands.js';
import { ReprocessTaskCommand } from '../commands/ReprocessTaskCommand.js';
import { StackController } from '../views/StackController.js';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';

describe('Auto-NLP Triggers', () => {
    let controller: StackController;
    let mockTasks: TaskNode[];
    let onTaskUpdate: any;

    beforeEach(() => {
        onTaskUpdate = vi.fn();
        mockTasks = [
            {
                id: 'task-1.md',
                title: 'Old Title',
                duration: 30,
                status: 'todo',
                isAnchored: false,
                children: []
            }
        ];
        controller = new StackController(mockTasks, moment(), onTaskUpdate);
    });

    describe('RenameTaskCommand Auto-NLP', () => {
        it('should extract metadata when renaming to a string with NLP hints', () => {
            const newTitle = "New Title 14:00 for 1h";
            const command = new RenameTaskCommand(controller, 0, newTitle);

            command.execute();

            const updatedTask = controller.getTasks()[0];
            expect(updatedTask?.title).toBe("New Title");
            expect(updatedTask?.duration).toBe(60);
            expect(updatedTask?.isAnchored).toBe(true);
            expect(updatedTask?.startTime?.format('HH:mm')).toBe('14:00');
        });

        it('should revert metadata when undoing a rename that had NLP', () => {
            const newTitle = "New Title 14:00 for 1h";
            const command = new RenameTaskCommand(controller, 0, newTitle);

            command.execute();
            command.undo();

            const revertedTask = controller.getTasks()[0];
            expect(revertedTask?.title).toBe("Old Title");
            expect(revertedTask?.duration).toBe(30);
            expect(revertedTask?.isAnchored).toBe(false);
        });
    });

    describe('Bulk Reprocess (Arrival Trigger)', () => {
        it('should correctly reprocess multiple tasks in the controller', async () => {
            const bulkTasks: TaskNode[] = [
                { id: 't1', title: 'Task A 10:00', duration: 30, status: 'todo', isAnchored: false, children: [] },
                { id: 't2', title: 'Task B for 2h', duration: 30, status: 'todo', isAnchored: false, children: [] },
                { id: 't3', title: 'Manual Task !manual 15:00', duration: 30, status: 'todo', isAnchored: false, children: [] }
            ];
            const bulkController = new StackController(bulkTasks, moment(), onTaskUpdate);
            const command = new ReprocessTaskCommand(bulkController, onTaskUpdate);

            await command.execute();

            const tasks = bulkController.getTasks();

            // Task A correctly parsed
            expect(tasks[0]?.title).toBe("Task A");
            expect(tasks[0]?.isAnchored).toBe(true);

            // Task B correctly parsed
            expect(tasks[1]?.title).toBe("Task B");
            expect(tasks[1]?.duration).toBe(120);

            // Task C (Manual) skipped
            expect(tasks[2]?.title).toBe("Manual Task !manual 15:00");
            expect(tasks[2]?.isAnchored).toBe(false);
        });
    });
});
