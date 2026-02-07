import { describe, it, expect, vi } from 'vitest';
import { StackController } from '../views/StackController.js';
import moment from 'moment';
import type { TaskNode } from '../scheduler.js';

describe('StackController: Scaling Logic', () => {
    const mockTasks: TaskNode[] = [
        {
            id: 'task-1',
            title: 'Task 1',
            duration: 30,
            status: 'todo',
            isAnchored: false,
            children: []
        }
    ];

    it('should scale duration up correctly (30m -> 45m -> 1h)', () => {
        const controller = new StackController(mockTasks, moment('2026-02-07T09:00:00Z'));

        // Initial state
        expect(controller.getTasks()[0]?.duration).toBe(30);

        // Scale Up 1
        controller.scaleDuration(0, 'up');
        expect(controller.getTasks()[0]?.originalDuration).toBe(45);

        // Scale Up 2
        controller.scaleDuration(0, 'up');
        expect(controller.getTasks()[0]?.originalDuration).toBe(60);
    });

    it('should scale duration down correctly (30m -> 20m -> 15m)', () => {
        const controller = new StackController(mockTasks, moment('2026-02-07T09:00:00Z'));

        // Scale Down 1
        controller.scaleDuration(0, 'down');
        expect(controller.getTasks()[0]?.originalDuration).toBe(20);

        // Scale Down 2
        controller.scaleDuration(0, 'down');
        expect(controller.getTasks()[0]?.originalDuration).toBe(15);
    });

    it('should respect boundaries (min 2m, max 480m)', () => {
        const tinyTask: TaskNode[] = [{ ...mockTasks[0], id: 'tiny', title: 'Tiny', duration: 2, status: 'todo', isAnchored: false, children: [] }];
        const controller = new StackController(tinyTask, moment());

        controller.scaleDuration(0, 'down');
        const tasks = controller.getTasks();
        expect(tasks[0]?.originalDuration).toBe(2);

        const hugeTask: TaskNode[] = [{ ...mockTasks[0], id: 'huge', title: 'Huge', duration: 480, status: 'todo', isAnchored: false, children: [] }];
        const controller2 = new StackController(hugeTask, moment());

        controller2.scaleDuration(0, 'up');
        const tasks2 = controller2.getTasks();
        expect(tasks2[0]?.originalDuration).toBe(480);
    });

    it('should handle adjustDuration with delta (2m floor)', () => {
        const controller = new StackController(mockTasks, moment());

        // 30m - 35m = -5m -> should floor at 2m
        controller.adjustDuration(0, -35);
        const tasks = controller.getTasks();
        expect(tasks[0]?.originalDuration).toBe(2);

        // 2m + 10m = 12m
        controller.adjustDuration(0, 10);
        const tasks2 = controller.getTasks();
        expect(tasks2[0]?.originalDuration).toBe(12);
    });
});
