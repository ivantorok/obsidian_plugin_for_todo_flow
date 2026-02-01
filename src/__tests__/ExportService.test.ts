import { describe, it, expect } from 'vitest';
import { ExportService } from '../services/ExportService.js';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';

describe('ExportService', () => {
    it('should format completed tasks into a markdown list', () => {
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

        expect(output).toContain('- [x] 09:00 [[task1.md|Done Task]] (30m)');
        expect(output).not.toContain('Pending Task');
    });

    it('should return helpful message if no tasks are completed', () => {
        const service = new ExportService();
        const output = service.formatExport([]);
        expect(output).toContain('No completed tasks to export.');
    });
});
