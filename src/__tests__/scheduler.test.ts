import { describe, it, expect } from 'vitest';
import moment from 'moment';
import { computeSchedule, type TaskNode } from '../scheduler.js';

describe('Rock and Water Scheduler', () => {
    const now = moment('2026-01-25 08:00');

    it('should flow floating tasks around an anchored rock', () => {
        const tasks: Partial<TaskNode>[] = [
            { id: 'Float1', duration: 30, isAnchored: false },
            { id: 'Rock1', duration: 60, isAnchored: true, startTime: moment('2026-01-25 09:00') },
            { id: 'Float2', duration: 30, isAnchored: false }
        ];

        const schedule = computeSchedule(tasks as TaskNode[], now);

        // Sorted by time:
        // 1. Float1 (08:00-08:30)
        // 2. Float2 (08:30-09:00) - Fills gap
        // 3. Rock1 (09:00-10:00)

        expect(schedule[0]!.id).toBe('Float1');
        expect(schedule[0]!.startTime!.format('HH:mm')).toBe('08:00');

        expect(schedule[1]!.id).toBe('Float2');
        expect(schedule[1]!.startTime!.format('HH:mm')).toBe('08:30');

        expect(schedule[2]!.id).toBe('Rock1');
        expect(schedule[2]!.startTime!.format('HH:mm')).toBe('09:00');
    });

    it('should fit a floating task into a gap before a rock if it fits', () => {
        const tasks: Partial<TaskNode>[] = [
            { id: 'Float1', duration: 30, isAnchored: false },
            { id: 'Rock1', duration: 60, isAnchored: true, startTime: moment('2026-01-25 09:00') }
        ];

        const schedule = computeSchedule(tasks as TaskNode[], now);
        expect(schedule[0]!.startTime!.format('HH:mm')).toBe('08:00');
    });

    it('should handle multiple rocks and fill gaps', () => {
        const tasks: Partial<TaskNode>[] = [
            { id: 'Float1', duration: 30, isAnchored: false },
            { id: 'Rock1', duration: 30, isAnchored: true, startTime: moment('2026-01-25 09:00') },
            { id: 'Float2', duration: 30, isAnchored: false },
            { id: 'Rock2', duration: 30, isAnchored: true, startTime: moment('2026-01-25 11:00') }
        ];

        const schedule = computeSchedule(tasks as TaskNode[], now);

        // Sorted:
        // 1. Float1 (08:00-08:30)
        // 2. Float2 (08:30-09:00)
        // 3. Rock1 (09:00-09:30)
        // 4. Rock2 (11:00-11:30)

        expect(schedule[0]!.id).toBe('Float1');
        expect(schedule[0]!.startTime!.format('HH:mm')).toBe('08:00');

        expect(schedule[1]!.id).toBe('Float2');
        expect(schedule[1]!.startTime!.format('HH:mm')).toBe('08:30');

        expect(schedule[2]!.id).toBe('Rock1');
        expect(schedule[2]!.startTime!.format('HH:mm')).toBe('09:00');

        expect(schedule[3]!.id).toBe('Rock2');
        expect(schedule[3]!.startTime!.format('HH:mm')).toBe('11:00');
    });

    it('should leapfrog (Expansion): unanchored tasks jump over rocks they collide with', () => {
        const start = moment('2026-01-25 08:00');
        const tasks: Partial<TaskNode>[] = [
            { id: 'Water1', duration: 75, isAnchored: false }, // 08:00 -> 09:15
            { id: 'Rock', duration: 30, isAnchored: true, startTime: moment('2026-01-25 09:00') }
        ];

        const schedule = computeSchedule(tasks as TaskNode[], start);

        // Water1 cannot fit before 09:00. It leapfrogs to 09:30.
        // Sorted:
        // 1. Rock (09:00)
        // 2. Water1 (09:30)

        expect(schedule[0]!.id).toBe('Rock');
        expect(schedule[0]!.startTime!.format('HH:mm')).toBe('09:00');

        expect(schedule[1]!.id).toBe('Water1');
        expect(schedule[1]!.startTime!.format('HH:mm')).toBe('09:30');
    });

    it('should flow upward (Contraction): tasks fill gaps if they now fit before a rock', () => {
        const start = moment('2026-01-25 08:00');
        const tasks: Partial<TaskNode>[] = [
            { id: 'Water1', duration: 30, isAnchored: false },
            { id: 'Rock', duration: 30, isAnchored: true, startTime: moment('2026-01-25 09:00') }
        ];

        let schedule = computeSchedule(tasks as TaskNode[], start);

        // Water1 fits at 08:00.
        // Sorted: Water1(08:00), Rock(09:00)
        expect(schedule[0]!.id).toBe('Water1');
        expect(schedule[0]!.startTime!.format('HH:mm')).toBe('08:00');
    });

    it('should handle chain reaction (Liquid Reordering): subsequent water leapfrogs rock if pushed', () => {
        const start = moment('2026-01-25 08:00');
        const tasks: Partial<TaskNode>[] = [
            { id: 'W1', duration: 30, isAnchored: false },
            { id: 'W2', duration: 30, isAnchored: false },
            { id: 'Rock', duration: 30, isAnchored: true, startTime: moment('2026-01-25 09:30') }
        ];

        // W1 expands to 65m (08:00-09:05). 
        // W2 (30m) at 09:05 would end 09:35. Collides with Rock (09:30). Leapfrogs to 10:00.
        // Sorted:
        // 1. W1 (08:00)
        // 2. Rock (09:30)
        // 3. W2 (10:00)

        tasks[0]!.duration = 65;
        let schedule = computeSchedule(tasks as TaskNode[], start);

        expect(schedule[0]!.id).toBe('W1');
        expect(schedule[0]!.startTime!.format('HH:mm')).toBe('08:00');

        expect(schedule[1]!.id).toBe('Rock');
        expect(schedule[1]!.startTime!.format('HH:mm')).toBe('09:30');

        expect(schedule[2]!.id).toBe('W2');
        expect(schedule[2]!.startTime!.format('HH:mm')).toBe('10:00');
    });
});
