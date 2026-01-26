import { describe, it, expect } from 'vitest';
import { computeSchedule, getTotalGreedyDuration, type TaskNode } from '../scheduler.js';
import moment from 'moment';

describe('Ghost Scheduling Side Quest 👻', () => {
    it('DONE tasks should have zero effective duration in the schedule but keep their display duration', () => {
        const now = moment('2024-01-01 10:00');

        // n1 is DONE, n2 is TODO
        const n1: TaskNode = {
            id: 'n1', title: 'Task 1', duration: 60, status: 'done', isAnchored: false, children: []
        };
        const n2: TaskNode = {
            id: 'n2', title: 'Task 2', duration: 30, status: 'todo', isAnchored: false, children: []
        };

        const scheduled = computeSchedule([n1, n2], now);

        // Verification:
        const s1 = scheduled.find(t => t.id === 'n1')!;
        const s2 = scheduled.find(t => t.id === 'n2')!;

        // 1. DONE task still starts at 'now'
        expect(s1.startTime?.format('HH:mm')).toBe('10:00');

        // 2. CRITICAL: Next TODO task ALSO starts at '10:00' because n1 is DONE (Ghost)
        expect(s2.startTime?.format('HH:mm')).toBe('10:00');

        // 3. UI should still see the roll-up (currently 60m because it's a leaf)
        // Wait, current logic makes n1.duration = 0 if it is DONE.
        // We want n1.duration to be the "historical" duration (60m).
        expect(s1.duration).toBe(60);
    });

    it('Toggling DONE back to TODO should push the schedule', () => {
        const now = moment('2024-01-01 10:00');

        const n1: TaskNode = { id: 'n1', title: 'Task 1', duration: 60, status: 'todo', isAnchored: false, children: [] };
        const n2: TaskNode = { id: 'n2', title: 'Task 2', duration: 30, status: 'todo', isAnchored: false, children: [] };

        const scheduled = computeSchedule([n1, n2], now);
        const s2 = scheduled.find(t => t.id === 'n2')!;

        // n1 is TODO (60m), so n2 starts at 11:00
        expect(s2.startTime?.format('HH:mm')).toBe('11:00');
    });

    it('Multiple DONE tasks should stack at the same time', () => {
        const now = moment('2024-01-01 10:00');

        const n1: TaskNode = { id: 'n1', status: 'done', duration: 60, title: 'D1', isAnchored: false, children: [] };
        const n2: TaskNode = { id: 'n2', status: 'done', duration: 60, title: 'D2', isAnchored: false, children: [] };
        const n3: TaskNode = { id: 'n3', status: 'todo', duration: 30, title: 'T3', isAnchored: false, children: [] };

        const scheduled = computeSchedule([n1, n2, n3], now);

        expect(scheduled.find(t => t.id === 'n1')!.startTime?.format('HH:mm')).toBe('10:00');
        expect(scheduled.find(t => t.id === 'n2')!.startTime?.format('HH:mm')).toBe('10:00');
        expect(scheduled.find(t => t.id === 'n3')!.startTime?.format('HH:mm')).toBe('10:00');
    });
});
