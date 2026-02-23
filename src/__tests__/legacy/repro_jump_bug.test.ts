import { describe, it, expect } from 'vitest';
import { StackController } from '../views/StackController.js';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';

describe('Reproduce Jump Bug', () => {
    it('should reproduce index mismatch when task jumps past anchor', () => {
        const now = moment('2026-01-25 08:00');
        const tasks: TaskNode[] = [
            { id: 'A', title: 'Task A', duration: 30, isAnchored: false, status: 'todo', children: [] },
            { id: 'B', title: 'Task B', duration: 30, isAnchored: true, startTime: moment('2026-01-25 09:00'), status: 'todo', children: [] }
        ];

        const controller = new StackController(tasks, now);

        // Initial state: 0: A(08:00), 1: B(09:00)
        expect(controller.getTasks()[0]!.id).toBe('A');
        expect(controller.getTasks()[0]!.startTime?.format('HH:mm')).toBe('08:00');

        // Scale A to 45
        let index = controller.scaleDuration(0, 'up');
        expect(index).toBe(0);

        // Scale A to 60 (Ends at 09:00, exactly hits B)
        index = controller.scaleDuration(0, 'up');
        expect(index).toBe(0);

        // Scale A to 90 (Ends at 09:30, MUST jump past B)
        index = controller.scaleDuration(0, 'up');

        // HERE IS THE FIX: The controller should now return index 1
        expect(index).toBe(1);

        const currentTasks = controller.getTasks();

        // Verify the jump happened in the data too
        expect(currentTasks[0]!.id).toBe('B');
        expect(currentTasks[1]!.id).toBe('A');
    });
});
