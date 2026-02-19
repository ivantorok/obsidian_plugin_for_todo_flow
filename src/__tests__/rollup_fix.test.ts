import { describe, it, expect } from 'vitest';
import { getTotalGreedyDuration, type TaskNode } from '../scheduler.js';

describe('Phase 0: Rollup Double-Counting [SKEPTICAL SPEC]', () => {
    it('should NOT double-count when child duration already includes subtasks', () => {
        // Setup: A tree where 'Child' already has a 'duration' field that is a rollup of its subtasks.
        // This simulates a 'dirty' registry where pre-calculated fields are present.
        const root: TaskNode = {
            id: 'Root',
            title: 'Root Task',
            duration: 10,
            originalDuration: 10,
            isAnchored: false,
            status: 'todo',
            children: [
                {
                    id: 'Child',
                    title: 'Child Task',
                    duration: 50, // 20 (own) + 30 (grandchild) - THIS IS THE PROBLEM
                    originalDuration: 20,
                    isAnchored: false,
                    status: 'todo',
                    children: [
                        {
                            id: 'Grandchild',
                            title: 'Grandchild Task',
                            duration: 30,
                            originalDuration: 30,
                            isAnchored: false,
                            status: 'todo',
                            children: []
                        }
                    ]
                }
            ]
        };

        const result = getTotalGreedyDuration(root);

        // Expected: 10 (Root) + 20 (Child) + 30 (Grandchild) = 60
        // Actual (Buggy): 10 + 50 (Child) + 30 (Grandchild) = 90
        expect(result.total).toBe(60);
    });
});
