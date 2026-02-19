import { describe, it, expect } from 'vitest';
import { getTotalGreedyDuration, type TaskNode } from '../scheduler.js';

describe('getTotalGreedyDuration', () => {
    it('should sum own duration and all subtasks', () => {
        const root: TaskNode = {
            id: 'root',
            title: 'Root',
            duration: 60,
            originalDuration: 60,
            status: 'todo',
            isAnchored: false,
            children: [
                { id: 'child1', title: 'C1', duration: 30, status: 'todo', isAnchored: false, children: [] },
                { id: 'child2', title: 'C2', duration: 45, status: 'todo', isAnchored: false, children: [] }
            ]
        };

        const result = getTotalGreedyDuration(root);
        expect(result.total).toBe(60 + 30 + 45);
        expect(result.trace).toContain('Base: 60m');
        expect(result.trace).toContain('+30m from C1');
        expect(result.trace).toContain('+45m from C2');
    });

    it('should handle diamond graphs (deduplication)', () => {
        const d: TaskNode = { id: 'd', title: 'D', duration: 30, status: 'todo', isAnchored: false, children: [] };
        const b: TaskNode = { id: 'b', title: 'B', duration: 0, status: 'todo', isAnchored: false, children: [d] };
        const c: TaskNode = { id: 'c', title: 'C', duration: 0, status: 'todo', isAnchored: false, children: [d] };
        const a: TaskNode = { id: 'a', title: 'A', duration: 60, originalDuration: 60, status: 'todo', isAnchored: false, children: [b, c] };

        expect(getTotalGreedyDuration(a).total).toBe(90);
    });

    it('should prune "done" tasks and their subtrees', () => {
        const subtree: TaskNode = { id: 'subtree', title: 'Sub', duration: 100, status: 'todo', isAnchored: false, children: [] };
        const doneTask: TaskNode = { id: 'done', title: 'Done', duration: 50, status: 'done', isAnchored: false, children: [subtree] };
        const root: TaskNode = { id: 'root', title: 'Root', duration: 60, originalDuration: 60, status: 'todo', isAnchored: false, children: [doneTask] };

        expect(getTotalGreedyDuration(root).total).toBe(60);
    });

    it('should handle cycles gracefully', () => {
        const a: TaskNode = { id: 'a', title: 'A', duration: 30, originalDuration: 30, status: 'todo', isAnchored: false, children: [] };
        const b: TaskNode = { id: 'b', title: 'B', duration: 30, originalDuration: 30, status: 'todo', isAnchored: false, children: [] };
        a.children = [b];
        b.children = [a];

        expect(getTotalGreedyDuration(a).total).toBe(60);
    });

    it('should show resiliency: find child via todo path even if other path is done', () => {
        const d: TaskNode = { id: 'd', title: 'D', duration: 30, status: 'todo', isAnchored: false, children: [] };
        const doneB: TaskNode = { id: 'b', title: 'B', duration: 50, status: 'done', isAnchored: false, children: [d] };
        const todoC: TaskNode = { id: 'c', title: 'C', duration: 10, originalDuration: 10, status: 'todo', isAnchored: false, children: [d] };
        const root: TaskNode = { id: 'root', title: 'Root', duration: 60, originalDuration: 60, status: 'todo', isAnchored: false, children: [doneB, todoC] };

        expect(getTotalGreedyDuration(root).total).toBe(100);
    });

    it('should use originalDuration if available', () => {
        const root: TaskNode = {
            id: 'root',
            title: 'Root',
            duration: 100,
            originalDuration: 60,
            status: 'todo',
            isAnchored: false,
            children: [
                { id: 'child1', title: 'C1', duration: 30, status: 'todo', isAnchored: false, children: [] }
            ]
        };

        expect(getTotalGreedyDuration(root).total).toBe(90);
    });

    it('should see updated duration from registry', () => {
        const child: TaskNode = { id: 'child', title: 'Child', duration: 20, originalDuration: 20, status: 'todo', isAnchored: false, children: [] };
        const parent: TaskNode = { id: 'parent', title: 'Parent', duration: 10, originalDuration: 10, status: 'todo', isAnchored: false, children: [child] };

        // Similate a scaled child (e.g. from 20 to 50)
        const updatedChild = { ...child, originalDuration: 50 };
        const registry = new Map<string, TaskNode>([
            ['child', updatedChild]
        ]);

        // Parent should see the 50m from the registry instead of the 20m in its children array
        const result = getTotalGreedyDuration(parent, registry);
        expect(result.total).toBe(10 + 50);
        expect(result.trace).toContain('+50m from Child');
    });
});
