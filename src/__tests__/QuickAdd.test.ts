import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StackController } from '../views/StackController.js';
import { InsertTaskCommand } from '../commands/stack-commands.js';
import moment from 'moment';
import { type TaskNode } from '../scheduler.js';

describe('Quick Add Logic (TDD)', () => {
    let controller: StackController;
    let initialTasks: TaskNode[];
    const now = moment('2026-01-28 09:00');

    beforeEach(() => {
        initialTasks = [
            { id: '1', title: 'Task 1', duration: 30, status: 'todo', isAnchored: false, children: [] },
            { id: '2', title: 'Task 2', duration: 30, status: 'todo', isAnchored: false, children: [] }
        ];
        controller = new StackController(initialTasks, now);
    });

    it('should insert a task after the specified index', () => {
        const newTask: TaskNode = { id: '3', title: 'New Task', duration: 30, status: 'todo', isAnchored: false, children: [] };

        // Insert after index 0 (Task 1)
        const newIndex = controller.insertAfter(0, newTask);
        const tasks = controller.getTasks();

        expect(tasks.length).toBe(3);
        expect(tasks[1]!.id).toBe('3');
        expect(newIndex).toBe(1);
        // Verify schedule shift
        expect(tasks[1]!.startTime?.format('HH:mm')).toBe('09:30');
        expect(tasks[2]!.startTime?.format('HH:mm')).toBe('10:00');
    });

    it('should support undoing the insertion via InsertTaskCommand', () => {
        const newTask: TaskNode = { id: '3', title: 'New Task', duration: 30, status: 'todo', isAnchored: false, children: [] };
        const cmd = new InsertTaskCommand(controller, 0, newTask);

        // Execute
        cmd.execute();
        expect(controller.getTasks().length).toBe(3);
        expect(cmd.resultIndex).toBe(1);

        // Undo
        cmd.undo();
        const tasks = controller.getTasks();
        expect(tasks.length).toBe(2);
        expect(tasks.find(t => t.id === '3')).toBeUndefined();
        // Verify schedule restored
        expect(tasks[1]!.startTime?.format('HH:mm')).toBe('09:30');
    });

    it('should handle insertion at the end of the stack', () => {
        const newTask: TaskNode = { id: '3', title: 'End Task', duration: 30, status: 'todo', isAnchored: false, children: [] };

        // Insert after index 1 (last task)
        const newIndex = controller.insertAfter(1, newTask);
        const tasks = controller.getTasks();

        expect(tasks.length).toBe(3);
        expect(tasks[2]!.id).toBe('3');
        expect(newIndex).toBe(2);
    });
});
