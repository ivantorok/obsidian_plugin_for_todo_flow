import { describe, it, expect, vi } from 'vitest';
import moment from 'moment';
import { StackController } from '../views/StackController';
import * as scheduler from '../scheduler';

describe('BUG-021: Intent Locking (Freeze Mechanism)', () => {
    it('should suppress schedule recalculations when frozen', () => {
        const spy = vi.spyOn(scheduler, 'computeSchedule');
        const tasks = [{ id: '1', title: 'Task 1', duration: 10, status: 'todo' as const, trace: [], isAnchored: false, children: [] }];
        const now = moment();

        const controller = new StackController(tasks, now);

        // Initial call during constructor
        expect(spy).toHaveBeenCalledTimes(1);
        spy.mockClear();

        // 1. Freeze the controller
        controller.freeze();

        // 2. Perform actions that normally trigger computeSchedule
        controller.setTasks([{ id: '1', title: 'Updated Task 1', duration: 10, status: 'todo' as const, trace: [], isAnchored: false, children: [] }]);
        controller.updateTime(now.clone().add(5, 'minutes'));
        controller.moveUp(0);

        // 3. Verify computeSchedule was NOT called
        expect(spy).not.toHaveBeenCalled();

        // 4. Unfreeze
        controller.unfreeze();

        // 5. Verify computeSchedule was called ONCE during unfreeze
        expect(spy).toHaveBeenCalledTimes(1);

        spy.mockRestore();
    });

    it('should correctly propagate highPressure from ProcessGovernor when recalculating', async () => {
        const spy = vi.spyOn(scheduler, 'computeSchedule');
        const tasks = [{ id: '1', title: 'Task 1', duration: 10, status: 'todo' as const, trace: [], isAnchored: false, children: [] }];
        const now = moment();

        const controller = new StackController(tasks, now);
        spy.mockClear();

        // Simulate interaction through controller unfreeze
        // In real app, governor state is used
        controller.unfreeze();

        expect(spy).toHaveBeenCalled();
        const callOptions = spy.mock.calls[0]?.[2];
        expect(callOptions).toHaveProperty('highPressure');

        spy.mockRestore();
    });
});
