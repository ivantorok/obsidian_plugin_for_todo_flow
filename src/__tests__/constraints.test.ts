import { describe, it, expect } from 'vitest';
import { type TaskNode, getMinDuration, computeSchedule } from '../scheduler.js';
import moment from 'moment';

describe('Subtask Constraints', () => {
    const child1: TaskNode = { id: 'c1', title: 'Child 1', duration: 10, status: 'todo', isAnchored: false, children: [] };
    const child2: TaskNode = { id: 'c2', title: 'Child 2', duration: 20, status: 'todo', isAnchored: false, children: [] };
    const doneChild: TaskNode = { id: 'cd', title: 'Done Child', duration: 15, status: 'done', isAnchored: false, children: [] };

    it('should calculate minimum duration as sum of incomplete children', () => {
        const parent: TaskNode = {
            id: 'p1', title: 'Parent', duration: 5, status: 'todo', isAnchored: false,
            children: [child1, child2, doneChild]
        };
        // 10 + 20 = 30 (doneChild is ignored)
        expect(getMinDuration(parent)).toBe(30);
    });

    it('should calculate minimum duration recursively', () => {
        const grandChild: TaskNode = { id: 'gc1', title: 'Grandchild', duration: 5, status: 'todo', isAnchored: false, children: [] };
        const childWithGrandchild: TaskNode = {
            id: 'c1', title: 'Child 1', duration: 2, status: 'todo', isAnchored: false,
            children: [grandChild]
        };

        const parent: TaskNode = {
            id: 'p1', title: 'Parent', duration: 0, status: 'todo', isAnchored: false,
            children: [childWithGrandchild]
        };

        // This implies getMinDuration needs to be smart about nested constraints
        // New logic: Sum of descendants = child(2) + grandchild(5) = 7
        expect(getMinDuration(parent)).toBe(7);
    });

    it('computeSchedule should expand task duration to meet minimum', () => {
        const now = moment('2026-01-25 08:00');

        const children: TaskNode[] = [
            { id: 'c1', title: 'C1', duration: 20, status: 'todo', isAnchored: false, children: [] },
            { id: 'c2', title: 'C2', duration: 20, status: 'todo', isAnchored: false, children: [] }
        ];

        const parent: TaskNode = {
            id: 'p1', title: 'Parent', duration: 10, status: 'todo', isAnchored: false,
            children: children
        };

        const schedule = computeSchedule([parent], now);

        // Parent duration (10) should have expanded to 50 (10 + 20 + 20)
        expect(schedule[0]!.duration).toBe(50);
    });
});
