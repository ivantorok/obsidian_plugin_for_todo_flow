import { describe, it, expect, beforeEach, vi } from 'vitest';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';

// Mock types locally to avoid importing main.ts (which triggers obsidian side-effects)
interface MockSettings {
    targetFolder: string;
    exportFolder: string;
    timingMode: 'now' | 'fixed';
    fixedStartTime: string;
    keys: any;
    debug: boolean;
}

// Mock dependencies
const mockSettings: MockSettings = {
    targetFolder: 'todo',
    exportFolder: '',
    timingMode: 'now',
    fixedStartTime: '09:00',
    keys: {},
    debug: false
};

describe('NLP Integration (Simulation)', () => {
    // We want to verify that if onTaskCreate receives metadata, it returns a Node with that metadata,
    // and that metadata survives to affect the schedule (mocked).

    it('should create a TaskNode with metadata when options are passed', () => {
        // Simulating the onCreateTask logic from main.ts (isolated simulation)
        const onCreateTask = (title: string, options?: { startTime?: moment.Moment, duration?: number, isAnchored?: boolean }): TaskNode => {
            return {
                id: 'mock/path.md',
                title,
                duration: options?.duration ?? 30,
                status: 'todo',
                isAnchored: options?.isAnchored ?? false,
                startTime: options?.startTime,
                children: []
            };
        };

        const startTime = moment('2026-01-29 14:00'); // Tomorrow 2pm
        const node = onCreateTask('Meeting', { startTime, duration: 60, isAnchored: true });

        expect(node.title).toBe('Meeting');
        expect(node.duration).toBe(60);
        expect(node.isAnchored).toBe(true);
        expect(node.startTime?.isSame(startTime)).toBe(true);
    });

    it('should respect Anchored tasks in a simulated Scheduler flow', async () => {
        // Import scheduler dynamically or use the real one
        const { computeSchedule } = await import('../scheduler.js');

        const now = moment('2026-01-29 09:00');

        // Scenario: 
        // 1. Task A (Floating, 30m) -> Should start at 09:00
        // 2. Task B (Anchored, 14:00, 60m) -> Should start at 14:00
        // 3. Task C (Floating, 30m) -> Should start after Task A? Or after Task B if A finishes early?
        //    Actually, floating tasks fill gaps. 
        //    A (30m) -> 09:00 - 09:30.
        //    B (Rock) -> 14:00 - 15:00.
        //    C (30m) -> Should flow after A -> 09:30 - 10:00.

        const tasks: TaskNode[] = [
            { id: '1', title: 'Task A', duration: 30, status: 'todo', isAnchored: false, children: [] },
            { id: '2', title: 'Task B', duration: 60, status: 'todo', isAnchored: true, startTime: moment('2026-01-29 14:00'), children: [] },
            { id: '3', title: 'Task C', duration: 30, status: 'todo', isAnchored: false, children: [] }
        ];

        const scheduled = computeSchedule(tasks, now);

        // Task A
        expect(scheduled[0]!.title).toBe('Task A');
        expect(scheduled[0]!.startTime?.format('HH:mm')).toBe('09:00');

        // Task C (should fill gap before B)
        // Wait, sort order of result is by Start Time.
        // A=09:00, C=09:30, B=14:00.
        expect(scheduled[1]!.title).toBe('Task C');
        expect(scheduled[1]!.startTime?.format('HH:mm')).toBe('09:30');

        // Task B (Rock)
        expect(scheduled[2]!.title).toBe('Task B');
        expect(scheduled[2]!.startTime?.format('HH:mm')).toBe('14:00');
    });
});
