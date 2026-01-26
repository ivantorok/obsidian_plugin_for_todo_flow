import { describe, it, expect, vi } from 'vitest';
import moment from 'moment';
import { type TaskNode } from '../scheduler.js';
import { serializeStackToMarkdown, parseMarkdownToStack } from '../persistence.js';

// Mock Obsidian dependencies
vi.mock('obsidian', () => ({
    MetadataCache: class { },
    TFile: class { }
}));

describe('Persistence Advanced: Serialization & Parsing', () => {

    describe('Serialization: Stack to Markdown', () => {
        it('should format a task list into the specific markdown export format', () => {
            const mockTasks: Partial<TaskNode>[] = [
                {
                    id: '1',
                    title: "Morning Routine",
                    startTime: moment('2026-01-25 08:00'),
                    duration: 30,
                    status: 'todo',
                    isAnchored: false,
                    children: []
                },
                {
                    id: '2',
                    title: "Deep Work",
                    startTime: moment('2026-01-25 08:30'),
                    duration: 90,
                    status: 'todo',
                    isAnchored: true,
                    children: []
                }
            ];

            const markdownOutput = serializeStackToMarkdown(mockTasks as TaskNode[]);

            expect(markdownOutput).toContain(`## Daily Stack - ${moment().format('YYYY-MM-DD')}`);
            // Note: The implementation uses pipe links
            expect(markdownOutput).toContain("- [ ] 08:00 [[1|Morning Routine]] (30m)");
            expect(markdownOutput).toContain("- [ ] 08:30 [[2|Deep Work]] (90m)");
        });
    });

    describe('Parsing: Markdown to List', () => {
        it('should extract task data from the exported markdown format', () => {
            const exportedContent = `## Daily Stack - 2026-01-25

- [ ] 09:15 [[20260125-z9y8-Email|Email Triage]] (45m)
- [ ] 10:00 [[20260125-x7w6-ProjectX|Project X]] (60m)
`;

            const loadedTasks = parseMarkdownToStack(exportedContent);

            expect(loadedTasks.length).toBe(2);

            const task1 = loadedTasks[0];
            expect(task1?.title).toBe("Email Triage");
            expect(task1?.startTime?.format("HH:mm")).toBe("09:15");
            expect(task1?.duration).toBe(45);
            expect(task1?.id).toContain("20260125-z9y8-Email");

            const task2 = loadedTasks[1];
            expect(task2?.title).toBe("Project X");
            expect(task2?.startTime?.format("HH:mm")).toBe("10:00");
            expect(task2?.duration).toBe(60);
        });
    });

});
