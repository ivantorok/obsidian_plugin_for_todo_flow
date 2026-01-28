import { describe, it, expect, vi } from 'vitest';
import { ReprocessTaskCommand } from '../commands/ReprocessTaskCommand.js';
import { DateParser } from '../utils/DateParser.js';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';

describe('ReprocessTaskCommand', () => {

    const mockController = {
        getTasks: vi.fn(),
        updateTaskMetadata: vi.fn(),
        updateTaskTitle: vi.fn()
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

        expect(mockController.updateTaskMetadata).not.toHaveBeenCalled();
    });

    it('should process tasks without !manual tag', async () => {
        const tasks: TaskNode[] = [
            { id: '2', title: 'Meeting at 2pm', duration: 30, status: 'todo', isAnchored: false, children: [] }
        ];
        mockController.getTasks.mockReturnValue(tasks);

        const cmd = new ReprocessTaskCommand(mockController as any, (task) => Promise.resolve());
        await cmd.execute();

        // Expect metadata update for anchored time
        expect(mockController.updateTaskMetadata).toHaveBeenCalled();
        // Expect title update to remove "at 2pm"
        expect(mockController.updateTaskTitle).toHaveBeenCalledWith(0, 'Meeting');
        // Note: index 0 depends on getting tasks array. 
        // Real implementation might need to match by ID or index. 
        // Command usually operates on stack index or we iterate.
        // Let's assume command reprocesses ALL.
    });
});
