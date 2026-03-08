import { describe, it, expect } from 'vitest';
import { type TaskNode, getTotalGreedyDuration } from '../../src/scheduler.js';

describe('Greedy Rollup Duration Calculation', () => {
    it('should sum leaf nodes correctly', () => {
        const child1: TaskNode = { id: 'c1', title: 'Child 1', duration: 15, status: 'todo', children: [], isAnchored: false };
        const child2: TaskNode = { id: 'c2', title: 'Child 2', duration: 30, status: 'todo', children: [], isAnchored: false };
        const parent: TaskNode = { id: 'p1', title: 'Parent', duration: 0, status: 'todo', children: [child1, child2], isAnchored: false };

        const result = getTotalGreedyDuration(parent);
        expect(result.total).toBe(45);
        expect(result.trace).toContain('+15m from Child 1');
        expect(result.trace).toContain('+30m from Child 2');
    });

    it('should include parent originalDuration as overhead', () => {
        const child: TaskNode = { id: 'c1', title: 'Child', duration: 10, status: 'todo', children: [], isAnchored: false };
        const parent: TaskNode = {
            id: 'p1',
            title: 'Parent',
            duration: 5,
            originalDuration: 5,
            status: 'todo',
            children: [child],
            isAnchored: false
        };

        const result = getTotalGreedyDuration(parent);
        expect(result.total).toBe(15); // 5m overhead + 10m child
    });

    it('should default to 0 overhead for parent nodes if originalDuration is missing', () => {
        const child: TaskNode = { id: 'c1', title: 'Child', duration: 15, status: 'todo', children: [], isAnchored: false };
        const parent: TaskNode = { id: 'p1', title: 'Parent', duration: 30, status: 'todo', children: [child], isAnchored: false };
        // originalDuration is undefined

        const result = getTotalGreedyDuration(parent);
        expect(result.total).toBe(15); // NOT 45!!
    });

    it('should handle nested hierarchies recursively', () => {
        const grandchild: TaskNode = { id: 'gc1', title: 'Grandchild', duration: 20, status: 'todo', children: [], isAnchored: false };
        const child: TaskNode = { id: 'c1', title: 'Child', duration: 0, status: 'todo', children: [grandchild], isAnchored: false };
        const parent: TaskNode = { id: 'p1', title: 'Parent', duration: 10, originalDuration: 10, status: 'todo', children: [child], isAnchored: false };

        const result = getTotalGreedyDuration(parent);
        expect(result.total).toBe(30); // 10m (parent) + 0m (child overhead) + 20m (grandchild)
    });

    it('should protect against infinite loops (circular references)', () => {
        const nodeA: any = { id: 'a', title: 'Node A', duration: 10, originalDuration: 10, status: 'todo', children: [], isAnchored: false };
        const nodeB: any = { id: 'b', title: 'Node B', duration: 20, originalDuration: 20, status: 'todo', children: [], isAnchored: false };

        nodeA.children = [nodeB];
        nodeB.children = [nodeA];

        const result = getTotalGreedyDuration(nodeA);
        expect(result.total).toBe(30); // 10 + 20, then stop
    });

    it('should skip DONE nodes in duration sum', () => {
        const childDone: TaskNode = { id: 'c1', title: 'Done Child', duration: 15, status: 'done', children: [], isAnchored: false };
        const childTodo: TaskNode = { id: 'c2', title: 'Todo Child', duration: 30, status: 'todo', children: [], isAnchored: false };
        const parent: TaskNode = { id: 'p1', title: 'Parent', duration: 0, status: 'todo', children: [childDone, childTodo], isAnchored: false };

        const result = getTotalGreedyDuration(parent);
        expect(result.total).toBe(30); // Only Todo child
    });
});
