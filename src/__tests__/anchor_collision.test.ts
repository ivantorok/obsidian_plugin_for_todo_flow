
import { describe, test, expect } from 'vitest';
import moment from 'moment';
import { type TaskNode, computeSchedule } from '../scheduler.js';

describe('Anchor Collision (Rocks Pushing Rocks)', () => {
    test('expanding upstream anchor should push downstream anchor', async () => {
        const baseTime = moment('2026-01-26 09:00');

        // Setup: Two anchored tasks back-to-back
        // Task A: 09:00 - 10:00 (60m)
        // Task B: 10:00 - 11:00 (60m)
        const tasks: TaskNode[] = [
            {
                id: 'A',
                title: 'Rock A',
                duration: 60,
                status: 'todo',
                isAnchored: true,
                startTime: moment(baseTime), // 09:00
                children: []
            },
            {
                id: 'B',
                title: 'Rock B',
                duration: 60,
                status: 'todo',
                isAnchored: true,
                startTime: moment(baseTime).add(60, 'minutes'), // 10:00
                children: []
            }
        ];

        // Act: Increase duration of Task A by 30m (Total 90m) manually
        if (tasks[0]) tasks[0].duration = 90;

        // Re-compute schedule based on modified task definitions
        const updatedTasks = computeSchedule(tasks, baseTime);
        const taskA = updatedTasks[0]!;
        const taskB = updatedTasks[1]!;

        // Assert A constraints
        expect(taskA.duration).toBe(90);
        // 09:00 + 90m = 10:30
        expect(taskA.startTime?.format('HH:mm')).toBe('09:00');

        // Assert B behavior
        // CURRENT BUG: Task B stays at 10:00 (Overlap)
        // EXPECTED: Task B pushed to 10:30 (No Overlap)
        console.log(`Task A: ${taskA.startTime?.format('HH:mm')} - ${taskA.duration}m`);
        console.log(`Task B: ${taskB.startTime?.format('HH:mm')} (Expected 10:30)`);

        expect(taskB.startTime?.format('HH:mm')).toBe('10:30');
    });
});
