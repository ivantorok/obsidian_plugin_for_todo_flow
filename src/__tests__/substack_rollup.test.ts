import { describe, it, expect } from 'vitest';
import { getTotalGreedyDuration, type TaskNode } from '../scheduler.js';
import moment from 'moment';

describe('Greedy Duration Rollup - Nested Hierarchies', () => {
    it('should correctly sum durations for a 3-level hierarchy', () => {
        // level 3
        const leaf3a: TaskNode = { id: '3a', title: 'L3A', duration: 10, status: 'todo', isAnchored: false, children: [] };
        const leaf3b: TaskNode = { id: '3b', title: 'L3B', duration: 5, status: 'todo', isAnchored: false, children: [] };

        // level 2
        const parent2: TaskNode = {
            id: '2',
            title: 'L2',
            duration: 0,
            status: 'todo',
            isAnchored: false,
            children: [leaf3a, leaf3b]
        };
        const leaf2b: TaskNode = { id: '2b', title: 'L2B', duration: 15, status: 'todo', isAnchored: false, children: [] };

        // level 1 (Root)
        const root: TaskNode = {
            id: 'root',
            title: 'Root',
            duration: 0,
            status: 'todo',
            isAnchored: false,
            children: [parent2, leaf2b]
        };

        const result = getTotalGreedyDuration(root, undefined, false);

        // Calculation: L3A (10) + L3B (5) + L2B (15) = 30m
        // Note: L2 and Root are non-leafs and have 0 duration, so they don't contribute overhead.
        expect(result.total).toBe(30);
    });

    it('should include parent originalDuration as overhead', () => {
        const child: TaskNode = { id: 'c', title: 'Child', duration: 10, status: 'todo', isAnchored: false, children: [] };
        const parent: TaskNode = {
            id: 'p',
            title: 'Parent',
            duration: 0,
            originalDuration: 5, // Overhead
            status: 'todo',
            isAnchored: false,
            children: [child]
        };

        const result = getTotalGreedyDuration(parent, undefined, false);
        expect(result.total).toBe(15); // 10 (child) + 5 (parent overhead)
    });

    it('should skip done tasks in rollup', () => {
        const todo: TaskNode = { id: 'todo', title: 'TODO', duration: 10, status: 'todo', isAnchored: false, children: [] };
        const done: TaskNode = { id: 'done', title: 'DONE', duration: 20, status: 'done', isAnchored: false, children: [] };
        const parent: TaskNode = {
            id: 'p',
            title: 'Parent',
            duration: 0,
            status: 'todo',
            isAnchored: false,
            children: [todo, done]
        };

        const result = getTotalGreedyDuration(parent, undefined, false);
        expect(result.total).toBe(10); // Only TODO counts
    });

    it('should correctly handle shared children across different branches (Diamond Pattern)', () => {
        const shared: TaskNode = { id: 'shared', title: 'Shared', duration: 10, status: 'todo', isAnchored: false, children: [] };
        const branchA: TaskNode = { id: 'A', title: 'A', duration: 0, status: 'todo', isAnchored: false, children: [shared] };
        const branchB: TaskNode = { id: 'B', title: 'B', duration: 0, status: 'todo', isAnchored: false, children: [shared] };
        const root: TaskNode = {
            id: 'root',
            title: 'Root',
            duration: 0,
            status: 'todo',
            isAnchored: false,
            children: [branchA, branchB]
        };

        const result = getTotalGreedyDuration(root, undefined, false);
        expect(result.total).toBe(10); // Shared task should only be counted once
    });
});
