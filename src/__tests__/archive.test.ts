import { describe, it, expect, vi } from 'vitest';
import { StackController } from '../views/StackController.js';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';

describe('Archive Logic', () => {
    const mockTasks: TaskNode[] = [
        { id: '1', title: 'Task 1', duration: 30, isAnchored: false, status: 'todo', children: [] },
        { id: '2', title: 'Task 2', duration: 30, isAnchored: false, status: 'todo', children: [] },
        { id: '3', title: 'Task 3', duration: 30, isAnchored: false, status: 'todo', children: [] }
    ];

    it('should remove a task from the list at specific index', () => {
        const controller = new StackController([...mockTasks], moment('2026-01-25 08:00'));
        controller.removeTask(1); // Remove Task 2

        const tasks = controller.getTasks();
        expect(tasks.length).toBe(2);
        expect(tasks[0]!.id).toBe('1');
        expect(tasks[1]!.id).toBe('3');
    });

    it('should insert a task into the list at specific index', () => {
        const controller = new StackController([mockTasks[0]!, mockTasks[2]!], moment('2026-01-25 08:00'));
        controller.insertTask(1, mockTasks[1]!); // Insert Task 2 back at index 1

        const tasks = controller.getTasks();
        expect(tasks.length).toBe(3);
        expect(tasks[1]!.id).toBe('2');
        expect(tasks[0]!.id).toBe('1');
        expect(tasks[2]!.id).toBe('3');
    });

    it('should maintain relative timing after removal and insertion', () => {
        const controller = new StackController([...mockTasks], moment('2026-01-25 08:00'));

        // Initial: 08:00, 08:30, 09:00
        controller.removeTask(1);
        // Task 3 should move to 08:30
        expect(controller.getTasks()[1]!.startTime?.format('HH:mm')).toBe('08:30');

        controller.insertTask(1, mockTasks[1]!);
        // Task 2 at 08:30, Task 3 back to 09:00
        expect(controller.getTasks()[1]!.startTime?.format('HH:mm')).toBe('08:30');
        expect(controller.getTasks()[2]!.startTime?.format('HH:mm')).toBe('09:00');
    });
});
