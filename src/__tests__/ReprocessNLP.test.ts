import { describe, it, expect, vi } from 'vitest';
import { ReprocessTaskCommand } from '../commands/ReprocessTaskCommand.js';
import { DateParser } from '../utils/DateParser.js';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';

describe('ReprocessTaskCommand', () => {

    const mockController = {
        getTasks: vi.fn(),
        updateTaskMetadata: vi.fn(),
        updateTaskTitle: vi.fn(),
        updateTaskById: vi.fn()
    };

    const mockHistoryManager = {
        executeCommand: vi.fn()
    };

    it('should skip tasks tagged with !manual', async () => {
        const tasks: TaskNode[] = [
            { id: '1', title: 'Meeting at 2pm !manual', duration: 30, status: 'todo', isAnchored: false, children: [] }
        ];
        mockController.getTasks.mockReturnValue(tasks);

        const cmd = new ReprocessTaskCommand(mockController as any, (task) => Promise.resolve());
        await cmd.execute();

        expect(mockController.updateTaskById).not.toHaveBeenCalled();
    });

    it('should process tasks without !manual tag', async () => {
        const tasks: TaskNode[] = [
            { id: '2', title: 'Meeting at 2pm', duration: 30, status: 'todo', isAnchored: false, children: [] }
        ];
        mockController.getTasks.mockReturnValue(tasks);
        mockController.updateTaskById.mockReturnValue(0);

        const cmd = new ReprocessTaskCommand(mockController as any, (task) => Promise.resolve());
        await cmd.execute();

        expect(mockController.updateTaskById).toHaveBeenCalledWith('2', expect.objectContaining({
            title: 'Meeting',
            isAnchored: true
        }));
    });
});
