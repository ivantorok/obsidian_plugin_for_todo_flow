import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TriageController } from '../views/TriageController.js';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';

describe('Triage Controller QuickAdd', () => {
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

    it('should allow adding tasks mid-session and triaging them', async () => {
        const tasks: TaskNode[] = [
            { id: '1.md', title: 'Task 1', duration: 30, status: 'todo' as const, isAnchored: false, children: [] }
        ];
        const controller = new TriageController(mockApp, tasks);

        // 1. Start with 1 task.
        expect(controller.getCurrentTask()?.id).toBe('1.md');

        // 2. Swipe right on task 1.
        await controller.swipeRight();
        expect(controller.getCurrentTask()).toBeNull();

        // 3. Add a new task (QuickAdd behavior)
        const newTask: TaskNode = { id: '2.md', title: 'Task 2', duration: 30, status: 'todo' as const, isAnchored: false, children: [] };
        controller.addTask(newTask);

        // 4. Queue should now have Task 2
        expect(controller.getCurrentTask()?.id).toBe('2.md');

        // 5. Swipe right on task 2.
        await controller.swipeRight();
        expect(controller.getCurrentTask()).toBeNull();

        // 6. Check results
        const results = controller.getResults();
        expect(results.shortlist).toHaveLength(2);
        expect(results.shortlist![0]!.id).toBe('1.md');
        expect(results.shortlist![1]!.id).toBe('2.md');
    });

    it('should append tasks to the end if added while still triaging', async () => {
        const tasks: TaskNode[] = [
            { id: '1.md', title: 'Task 1', duration: 30, status: 'todo' as const, isAnchored: false, children: [] },
            { id: '2.md', title: 'Task 2', duration: 30, status: 'todo' as const, isAnchored: false, children: [] }
        ];
        const controller = new TriageController(mockApp, tasks);

        // At T1
        expect(controller.getCurrentTask()?.id).toBe('1.md');

        // Add T3
        const newTask: TaskNode = { id: '3.md', title: 'Task 3', duration: 30, status: 'todo' as const, isAnchored: false, children: [] };
        controller.addTask(newTask);

        // Should still be at T1
        expect(controller.getCurrentTask()?.id).toBe('1.md');

        await controller.swipeRight(); // Now at T2
        expect(controller.getCurrentTask()?.id).toBe('2.md');

        await controller.swipeRight(); // Now at T3
        expect(controller.getCurrentTask()?.id).toBe('3.md');

        await controller.swipeRight(); // Done
        expect(controller.getCurrentTask()).toBeNull();

        const results = controller.getResults();
        expect(results.shortlist).toHaveLength(3);
    });
});
