import { describe, it, expect } from 'vitest';
import { StackController } from '../views/StackController.js';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';

describe('StackController', () => {
    const mockTasks: TaskNode[] = [
        { id: '1', title: 'Task 1', duration: 30, isAnchored: false, status: 'todo', children: [] },
        { id: '2', title: 'Task 2', duration: 30, isAnchored: false, status: 'todo', children: [] }
    ];

    it('should maintain an ordered list of tasks', () => {
        const controller = new StackController(mockTasks, moment('2026-01-25 08:00'));
        expect(controller.getTasks()[0]!.id).toBe('1');
    });

    it('should reorder tasks and recalculate schedule', () => {
        const controller = new StackController(mockTasks, moment('2026-01-25 08:00'));
        controller.moveDown(0);

        const tasks = controller.getTasks();
        expect(tasks[0]!.id).toBe('2');
        expect(tasks[1]!.id).toBe('1');
        // Check timing
        expect(tasks[0]!.startTime?.format('HH:mm')).toBe('08:00');
        expect(tasks[1]!.startTime?.format('HH:mm')).toBe('08:30');
    });

    it('should toggle anchor and recalculate', () => {
        const now = moment('2026-01-25 08:00');
        const controller = new StackController(mockTasks, now);

        // Change Task 2 to be anchored at 09:00
        controller.toggleAnchor(1, moment('2026-01-25 09:00'));

        const tasks = controller.getTasks();
        expect(tasks[1]!.isAnchored).toBe(true);
        expect(tasks[1]!.startTime?.format('HH:mm')).toBe('09:00');
    });

    it('should scale duration upwards following the sequence', () => {
        const controller = new StackController([{ id: '1', title: 'Task 1', duration: 15, isAnchored: false, status: 'todo', children: [] }], moment('2026-01-25 08:00'));
        controller.scaleDuration(0, 'up');
        expect(controller.getTasks()[0]!.duration).toBe(20);
        controller.scaleDuration(0, 'up');
        expect(controller.getTasks()[0]!.duration).toBe(30);
    });

    it('should scale duration downwards and respect subtask sum', () => {
        const subtasks: TaskNode[] = [
            { id: '2', title: 'Sub 1', duration: 10, isAnchored: false, status: 'todo', children: [] },
            { id: '3', title: 'Sub 2', duration: 5, isAnchored: false, status: 'todo', children: [] }
        ];
        const task: TaskNode = { id: '1', title: 'Parent', duration: 20, isAnchored: false, status: 'todo', children: subtasks };
        const controller = new StackController([task], moment('2026-01-25 08:00'));

        // Try to scale down to 15 (sum of children is 15)
        // Original was 20. Subtasks are 15. Total was 35.
        // Scaling down makes Original 15. Total = 15 + 15 = 30.
        controller.scaleDuration(0, 'down');
        expect(controller.getTasks()[0]!.duration).toBe(30);

        // Try to scale down again (should go to next sequence 10)
        // Original 10 + 15 = 25
        controller.scaleDuration(0, 'down');
        expect(controller.getTasks()[0]!.duration).toBe(25);
    });


});
