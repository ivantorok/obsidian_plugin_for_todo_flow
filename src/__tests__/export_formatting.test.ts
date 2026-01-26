import { describe, it, expect } from 'vitest';
import { serializeStackToMarkdown } from '../persistence.js';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';

describe('Export Formatting', () => {
    it('should format tasks in a clean single-line style', () => {
        const tasks: TaskNode[] = [
            {
                id: 'path/to/MyNote.md',
                title: 'Finish Report',
                duration: 45,
                status: 'todo',
                isAnchored: false,
                children: [],
                startTime: moment('09:00', 'HH:mm')
            }
        ];

        const output = serializeStackToMarkdown(tasks);

        // Old: - [ ] 09:00, Finish Report, [[path/to/MyNote.md]] (45m)
        // New: - [ ] 09:00 [[path/to/MyNote.md|Finish Report]] (45m)

        expect(output).toContain('- [ ] 09:00 [[path/to/MyNote.md|Finish Report]] (45m)');
        expect(output).not.toContain(', Finish Report,');
    });

    it('should handle missing start times gracefully', () => {
        const tasks: TaskNode[] = [
            {
                id: '1',
                title: 'Untitled',
                duration: 30,
                status: 'todo',
                isAnchored: false,
                children: []
                // No startTime
            }
        ];
        const output = serializeStackToMarkdown(tasks);
        expect(output).toContain('- [ ] 00:00 [[1|Untitled]] (30m)');
    });
});
