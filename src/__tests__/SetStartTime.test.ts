import { describe, it, expect } from 'vitest';
import { StackController } from '../views/StackController.js';
// @ts-ignore - Command does not exist yet (RED phase)
import { SetStartTimeCommand } from '../commands/stack-commands.js';
import { HistoryManager } from '../history.js';
import moment from 'moment';

describe('SetStartTimeCommand', () => {
    it('should anchor a task at a specific time', async () => {
        const now = moment('2026-01-31 09:00');
        const tasks = [
            { id: '1', title: 'Task 1', duration: 30, flow_state: 'shortlist' }
        ];
        const controller = new StackController(tasks, now);
        const history = new HistoryManager();

        // 09:00 start + 30m = lands at 09:00 initially
        expect(controller.getTasks()[0].startTime.format('HH:mm')).toBe('09:00');

        // Set start time to 10:30
        const cmd = new SetStartTimeCommand(controller, 0, '10:30');
        await history.executeCommand(cmd);

        const updatedTasks = controller.getTasks();
        expect(updatedTasks[0].startTime.format('HH:mm')).toBe('10:30');
        expect(updatedTasks[0].isAnchored).toBe(true);
    });

    it('should support undo/redo', async () => {
        const now = moment('2026-01-31 09:00');
        const tasks = [
            { id: '1', title: 'Task 1', duration: 30, flow_state: 'shortlist' }
        ];
        const controller = new StackController(tasks, now);
        const history = new HistoryManager();

        const cmd = new SetStartTimeCommand(controller, 0, '11:00');
        await history.executeCommand(cmd);
        expect(controller.getTasks()[0].startTime.format('HH:mm')).toBe('11:00');

        await history.undo();
        expect(controller.getTasks()[0].startTime.format('HH:mm')).toBe('09:00');
        expect(controller.getTasks()[0].isAnchored).toBe(false);

        await history.redo();
        expect(controller.getTasks()[0].startTime.format('HH:mm')).toBe('11:00');
        expect(controller.getTasks()[0].isAnchored).toBe(true);
    });
});
