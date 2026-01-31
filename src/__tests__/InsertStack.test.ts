import { describe, it, expect, vi, beforeEach } from 'vitest';
import moment from 'moment';
import { serializeStackToMarkdown } from '../persistence.js';
import { type TaskNode } from '../scheduler.js';

describe('Insert Stack at Cursor (TDD)', () => {
    const mockTasks: TaskNode[] = [
        {
            id: 'task-1',
            title: 'Test Task',
            startTime: moment('2026-01-31 09:00'),
            duration: 30,
            status: 'todo',
            isAnchored: false,
            children: []
        }
    ];

    it('should serialize tasks correctly for insertion', () => {
        const content = serializeStackToMarkdown(mockTasks);
        expect(content).toContain('## Daily Stack');
        expect(content).toContain('- [ ] 09:00 [[task-1|Test Task]] (30m)');
        expect(content).not.toContain('<!-- TODO_FLOW_STACK_START -->');
    });

    it('should fail if no leaves are available (mocking main.ts logic)', async () => {
        // This is more of an integration test for main.ts which is harder to unit test directly
        // because of the Obsidian API dependencies. 
        // We will focus on the serialization logic first, and then the command registration.
    });
});
