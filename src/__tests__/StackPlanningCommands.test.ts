import { describe, it, expect, vi } from 'vitest';
import { StackController } from '../views/StackController.js';
import { AdjustDurationCommand, ReorderToIndexCommand } from '../commands/stack-commands.js';
import moment from 'moment';
import { type TaskNode } from '../scheduler.js';

describe('Stack Planning Commands (TDD)', () => {
    const now = moment('2026-01-31T09:00:00');
    const getInitialTasks = (): TaskNode[] => [
        { id: '1', title: 'Task 1', duration: 30, startTime: now.clone(), status: 'todo', children: [], isAnchored: false },
        { id: '2', title: 'Task 2', duration: 30, startTime: now.clone().add(30, 'm'), status: 'todo', children: [], isAnchored: false },
    ];

    it('AdjustDurationCommand should execute and undo', () => {
        const controller = new StackController(getInitialTasks(), now);
        const cmd = new AdjustDurationCommand(controller, 0, 15);

        cmd.execute();
        expect(controller.getTasks()[0]!.duration).toBe(45);

        cmd.undo();
        expect(controller.getTasks()[0]!.duration).toBe(30);
    });

    it('ReorderToIndexCommand should execute and undo', () => {
        const controller = new StackController(getInitialTasks(), now);
        // Move Task 1 to after Task 2
        const cmd = new ReorderToIndexCommand(controller, 0, 1);

        cmd.execute();
        expect(controller.getTasks()[0]!.id).toBe('2');
        expect(controller.getTasks()[1]!.id).toBe('1');

        cmd.undo();
        expect(controller.getTasks()[0]!.id).toBe('1');
        expect(controller.getTasks()[1]!.id).toBe('2');
    });
});
