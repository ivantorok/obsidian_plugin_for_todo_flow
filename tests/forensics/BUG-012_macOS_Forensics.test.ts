import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TriageController } from '../../src/views/TriageController.js';
import { type TaskNode } from '../../src/scheduler.js';

describe('BUG-012 Forensics: Existing Task Addition during Triage', () => {
    let mockApp: any;

    beforeEach(() => {
        mockApp = {
            vault: {
                getAbstractFileByPath: vi.fn().mockReturnValue({ extension: 'md' }),
                process: vi.fn().mockImplementation((file, callback) => {
                    callback('content');
                    return Promise.resolve();
                })
            }
        };
    });

    it('Scenario 1: Adding existing task to an EMPTY queue (after finishing)', async () => {
        const controller = new TriageController(mockApp, []);

        // Initially empty
        expect(controller.getCurrentTask()).toBeNull();

        // Add an existing task (simulating TriageView.ts logic)
        const existingTask: TaskNode = {
            id: 'existing.md',
            title: 'Existing Task',
            duration: 30,
            status: 'todo',
            isAnchored: false,
            children: []
        };

        controller.addTask(existingTask);

        // Should now be the current task
        const current = controller.getCurrentTask();
        expect(current).not.toBeNull();
        expect(current?.id).toBe('existing.md');
    });

    it('Scenario 2: Adding existing task MID-queue (should append to end)', async () => {
        const initialTasks: TaskNode[] = [
            { id: '1.md', title: 'Task 1', duration: 30, status: 'todo', isAnchored: false, children: [] },
            { id: '2.md', title: 'Task 2', duration: 30, status: 'todo', isAnchored: false, children: [] }
        ];
        const controller = new TriageController(mockApp, initialTasks);

        // At Task 1
        expect(controller.getCurrentTask()?.id).toBe('1.md');

        // Add Task 3
        const existingTask: TaskNode = {
            id: '3.md',
            title: 'Task 3',
            duration: 30,
            status: 'todo',
            isAnchored: false,
            children: []
        };
        controller.addTask(existingTask);

        // Still at Task 1
        expect(controller.getCurrentTask()?.id).toBe('1.md');

        // Swipe through
        await controller.swipeRight(); // Task 2
        await controller.swipeRight(); // Task 3
        expect(controller.getCurrentTask()?.id).toBe('3.md');
    });

    it('Scenario 3: Adding task after queue is empty (simulating the Svelte UI "Done" state)', async () => {
        const controller = new TriageController(mockApp, []);
        expect(controller.getCurrentTask()).toBeNull();

        // Simulate reaching the end (index = 0, tasks = [])
        // Now add a task
        const newTask: TaskNode = { id: 'new.md', title: 'New', duration: 30, status: 'todo', isAnchored: false, children: [] };
        controller.addTask(newTask);

        // Controller should now provide the task
        expect(controller.getCurrentTask()?.id).toBe('new.md');
    });
});
