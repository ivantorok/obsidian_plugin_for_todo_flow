import { describe, it, expect } from 'vitest';
import { ExportService } from '../services/ExportService.js';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';

describe('ExportService', () => {
    it('should format all tasks into a markdown list with checkboxes and times', () => {
        const mockTasks: Partial<TaskNode>[] = [
            {
                id: 'task1.md',
                title: 'Done Task',
                status: 'done',
                startTime: moment('2024-01-01 09:00'),
                duration: 30
            },
            {
                id: 'task2.md',
                title: 'Pending Task',
                status: 'todo',
                startTime: moment('2024-01-01 09:30'),
                duration: 15
            }
        ];

        const service = new ExportService();
        const output = service.formatExport(mockTasks as TaskNode[]);

        expect(output).toContain('- [x] 09:00 [[task1.md|Done Task]]');
        expect(output).toContain('- [ ] 09:30 [[task2.md|Pending Task]]');
    });

    it('should return helpful message if stack is empty', () => {
        const service = new ExportService();
        const output = service.formatExport([]);
        expect(output).toContain('No tasks to export.');
    });
});
