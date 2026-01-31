import { describe, it, expect } from 'vitest';
import { StackController } from '../views/StackController.js';
import moment from 'moment';
import { type TaskNode } from '../scheduler.js';

describe('StackController - Planning Features (TDD)', () => {
    const now = moment('2026-01-31T09:00:00');
    const initialTasks: TaskNode[] = [
        { id: '1', title: 'Task 1', duration: 30, startTime: now.clone(), status: 'todo', children: [], isAnchored: false },
        { id: '2', title: 'Task 2', duration: 30, startTime: now.clone().add(30, 'm'), status: 'todo', children: [], isAnchored: false },
        { id: '3', title: 'Task 3', duration: 30, startTime: now.clone().add(60, 'm'), status: 'todo', isAnchored: true, children: [] },
        { id: '4', title: 'Task 4', duration: 30, startTime: now.clone().add(90, 'm'), status: 'todo', children: [], isAnchored: false },
    ];

    it('should adjust duration by a delta', () => {
        const controller = new StackController(initialTasks, now);
        // Increase Task 1 by 15m
        controller.adjustDuration(0, 15);
        const tasks = controller.getTasks();

        const t1 = tasks.find((t: TaskNode) => t.id === '1')!;
        const t2 = tasks.find((t: TaskNode) => t.id === '2')!;
        const t3 = tasks.find((t: TaskNode) => t.id === '3')!;

        expect(t1.duration).toBe(45);
        // Task 2 doesn't fit in [09:45, 10:00], so it jumps to after Task 3 (10:30)
        expect(t1.startTime!.format('HH:mm')).toBe('09:00');
        expect(t2.startTime!.format('HH:mm')).toBe('10:30');
        expect(t3.startTime!.format('HH:mm')).toBe('10:00');
    });

    it('should not allow duration below 5m', () => {
        const controller = new StackController(initialTasks, now);
        // Decrease Task 1 by 100m (it's only 30m)
        controller.adjustDuration(0, -100);
        const tasks = controller.getTasks();
        expect(tasks[0]!.duration).toBe(5);
    });

    it('should reorder a task to a specific index', () => {
        const controller = new StackController(initialTasks, now);
        // Move Task 1 (index 0) to after Task 2 (index 1)
        controller.moveTaskToIndex(0, 1);
        const tasks = controller.getTasks();
        expect(tasks[0]!.id).toBe('2');
        expect(tasks[1]!.id).toBe('1');
        expect(tasks[2]!.id).toBe('3'); // Anchor stayed at index 2 (conceptually)
    });

    it('should move task around anchors correctly', () => {
        const controller = new StackController(initialTasks, now);
        // Move Task 1 (index 0) to index 3 (bottom)
        // Note: index 2 is an anchor.
        controller.moveTaskToIndex(0, 3);
        const tasks = controller.getTasks();

        // Task 1 should be at the bottom
        expect(tasks[3]!.id).toBe('1');
        // Task 3 (Anchor) should still be at 10:00 (index 2)
        expect(tasks[2]!.id).toBe('3');
        expect(tasks[2]!.startTime!.format('HH:mm')).toBe('10:00');
    });

    it('should refuse to move an anchored task', () => {
        const controller = new StackController(initialTasks, now);
        const result = controller.moveTaskToIndex(2, 0); // Task 3 is anchored
        expect(result).toBe(2); // Didn't move
        expect(controller.getTasks()[2]!.id).toBe('3');
    });
});
