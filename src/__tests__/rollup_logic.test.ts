
import { describe, it, expect } from 'vitest';
import moment from 'moment';
import { computeSchedule, getTotalGreedyDuration, type TaskNode } from '../scheduler.js';

// Helper to create a mock task
function createMockTask(id: string, title: string, duration: number, children: TaskNode[] = []): TaskNode {
    return {
        id,
        title,
        duration, // Initially displayed duration (may be overwritten by logic)
        originalDuration: duration, // Own duration
        isAnchored: false,
        status: 'todo',
        children
    };
}

describe('Task Duration Rollup Logic', () => {

    it('should rollup duration from a single child', () => {
        const child = createMockTask('child', 'Child Task', 15);
        const parent = createMockTask('parent', 'Parent Task', 10, [child]);

        // Logic check: Parent (10) + Child (15) = 25
        const { total } = getTotalGreedyDuration(parent);
        expect(total).toBe(25);
    });

    it('should rollup duration from multiple children', () => {
        const child1 = createMockTask('c1', 'Child 1', 10);
        const child2 = createMockTask('c2', 'Child 2', 20);
        const parent = createMockTask('p', 'Parent', 5, [child1, child2]);

        // Logic check: 5 + 10 + 20 = 35
        const { total } = getTotalGreedyDuration(parent);
        expect(total).toBe(35);
    });

    it('should rollup duration from nested children (Grandparent -> Parent -> Child)', () => {
        // Level 3
        const grandchild = createMockTask('gc', 'Grandchild', 15);
        // Level 2: Parent (10) + Grandchild (15) = 25 effective
        const parent = createMockTask('p', 'Parent', 10, [grandchild]);
        // Level 1: Grandparent (5) + Parent (25) = 30 effective?
        // Wait, getTotalGreedyDuration sums (Own + Subtasks).
        // Grandparent Own (5) + Parent Total (Own 10 + GC 15) = 30.
        const grandparent = createMockTask('gp', 'Grandparent', 5, [parent]);

        const { total } = getTotalGreedyDuration(grandparent);
        expect(total).toBe(30);
    });

    it('should ignore DONE tasks in rollup', () => {
        const childDone = createMockTask('done', 'Done Task', 20);
        childDone.status = 'done';

        const childTodo = createMockTask('todo', 'Todo Task', 10);
        const parent = createMockTask('p', 'Parent', 5, [childDone, childTodo]);

        // Logic: 5 (Parent) + 0 (Done) + 10 (Todo) = 15
        const { total } = getTotalGreedyDuration(parent);
        expect(total).toBe(15);
    });

    it('should handle deep nesting (4 levels)', () => {
        const l4 = createMockTask('l4', 'Level 4', 10);
        const l3 = createMockTask('l3', 'Level 3', 10, [l4]);
        const l2 = createMockTask('l2', 'Level 2', 10, [l3]);
        const l1 = createMockTask('l1', 'Level 1', 10, [l2]);

        const { total } = getTotalGreedyDuration(l1);
        expect(total).toBe(40);
    });

    it('should generate correct trace for nested rollup', () => {
        const l3 = createMockTask('l3', 'Level 3', 10);
        const l2 = createMockTask('l2', 'Level 2', 10, [l3]);
        const l1 = createMockTask('l1', 'Level 1', 10, [l2]);

        const { trace } = getTotalGreedyDuration(l1);

        // Expected: Base (10) + L2 (10) + L3 (10) -> trace should mention these
        expect(trace.length).toBeGreaterThan(0);
        expect(trace[0]).toContain('Base: 10m');
        expect(trace).toContain('+10m from Level 2');
        expect(trace).toContain('+10m from Level 3');
    });

    it('should use registry for consistent state if provided', () => {
        // Mock a scenario where the child object in 'parent.children' is stale, 
        // but the registry has the updated version.

        const staleChild = createMockTask('c1', 'Child', 10);
        const parent = createMockTask('p', 'Parent', 10, [staleChild]);

        const updatedChild = createMockTask('c1', 'Child', 50); // Updated duration
        const registry = new Map<string, TaskNode>();
        registry.set('c1', updatedChild);
        registry.set('p', parent);

        const { total } = getTotalGreedyDuration(parent, registry);
        // Should use updated child: 10 + 50 = 60
        expect(total).toBe(60);
    });
});
