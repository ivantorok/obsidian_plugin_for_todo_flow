import { describe, test, expect } from 'vitest';
import moment from 'moment';
import { type TaskNode, computeSchedule } from '../scheduler.js';

describe('The Slide - deterministic scheduling', () => {
    test('Floating task pushes subsequent anchored task', () => {
        const baseTime = moment('2026-03-12 09:00');
        
        const tasks: TaskNode[] = [
            {
                id: '1',
                title: 'Floating A',
                duration: 60,
                status: 'todo',
                isAnchored: false,
                children: []
            },
            {
                id: '2',
                title: 'Anchored B (10:00)',
                duration: 30,
                status: 'todo',
                isAnchored: true,
                startTime: moment('2026-03-12 10:00'),
                children: []
            }
        ];

        // Normal case: A finishes at 10:00, B starts at 10:00.
        let result = computeSchedule(tasks, baseTime);
        expect(result[0]!.startTime?.format('HH:mm')).toBe('09:00');
        expect(result[1]!.startTime?.format('HH:mm')).toBe('10:00');

        // Overlap case: A increases to 90m (ends at 10:30)
        tasks[0]!.duration = 90;
        result = computeSchedule(tasks, baseTime);
        expect(result[0]!.startTime?.format('HH:mm')).toBe('09:00');
        // THE SLIDE: B should be at 10:30
        expect(result[1]!.startTime?.format('HH:mm')).toBe('10:30');
    });

    test('Current Time pushes anchored task', () => {
        const baseTime = moment('2026-03-12 10:30'); // Current time is after Anchor's preferred start
        
        const tasks: TaskNode[] = [
            {
                id: '1',
                title: 'Anchored A (10:00)',
                duration: 30,
                status: 'todo',
                isAnchored: true,
                startTime: moment('2026-03-12 10:00'),
                children: []
            }
        ];

        const result = computeSchedule(tasks, baseTime);
        // THE SLIDE: A should slide to 10:30
        expect(result[0]!.startTime?.format('HH:mm')).toBe('10:30');
    });

    test('Chain reaction: A pushes B, B pushes C', () => {
        const baseTime = moment('2026-03-12 09:00');
        
        const tasks: TaskNode[] = [
            {
                id: '1',
                title: 'Task A (Floating)',
                duration: 90,
                status: 'todo',
                isAnchored: false,
                children: []
            },
            {
                id: '2',
                title: 'Task B (Anchor 10:00)',
                duration: 30,
                status: 'todo',
                isAnchored: true,
                startTime: moment('2026-03-12 10:00'),
                children: []
            },
            {
                id: '3',
                title: 'Task C (Anchor 10:15)',
                duration: 30,
                status: 'todo',
                isAnchored: true,
                startTime: moment('2026-03-12 10:15'),
                children: []
            }
        ];

        const result = computeSchedule(tasks, baseTime);
        expect(result[0]!.startTime?.format('HH:mm')).toBe('09:00'); // Ends at 10:30
        expect(result[1]!.startTime?.format('HH:mm')).toBe('10:30'); // Ends at 11:00
        expect(result[2]!.startTime?.format('HH:mm')).toBe('11:00'); // Ends at 11:30
    });

    test('Floating tasks do NOT jump over later anchored tasks (Order Preservation)', () => {
        const baseTime = moment('2026-03-12 09:00');
        
        const tasks: TaskNode[] = [
            {
                id: '1',
                title: 'Anchored A (12:00)',
                duration: 30,
                status: 'todo',
                isAnchored: true,
                startTime: moment('2026-03-12 12:00'),
                children: []
            },
            {
                id: '2',
                title: 'Floating B',
                duration: 30,
                status: 'todo',
                isAnchored: false,
                children: []
            }
        ];

        const result = computeSchedule(tasks, baseTime);
        // In the legacy system, Floating B would start at 09:00 (filling the hole).
        // IN SOVEREIGN UX: List order is sacred. A is first, so B must follow A.
        expect(result[0]!.startTime?.format('HH:mm')).toBe('12:00');
        expect(result[1]!.startTime?.format('HH:mm')).toBe('12:30');
    });
});
