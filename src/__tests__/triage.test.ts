import { describe, it, expect } from 'vitest';
import { TriageController } from '../views/TriageController.js';
import { type TaskNode } from '../scheduler.js';

describe('TriageController', () => {
    const task1: TaskNode = {
        id: '1', title: 'Task 1', duration: 30, status: 'todo', isAnchored: false, children: []
    };
    const task2: TaskNode = {
        id: '2', title: 'Task 2', duration: 15, status: 'todo', isAnchored: false, children: []
    };

    const mockApp = {
        vault: {
            getAbstractFileByPath: () => ({ extension: 'md' }),
            process: async (file: any, cb: any) => cb('')
        }
    } as any;

    it('should initialize with tasks', () => {
        const controller = new TriageController(mockApp, [task1, task2]);
        expect(controller.getCurrentTask()).toEqual(task1);
    });

    it('should swipe left (Not Now) and advance', () => {
        const controller = new TriageController(mockApp, [task1, task2]);
        controller.swipeLeft();
        expect(controller.getCurrentTask()).toEqual(task2);

        const results = controller.getResults();
        expect(results.notNow).toContain(task1);
        expect(results.shortlist).not.toContain(task1);
    });

    it('should swipe right (Shortlist) and advance', async () => {
        const controller = new TriageController(mockApp, [task1, task2]);
        await controller.swipeRight();
        expect(controller.getCurrentTask()).toEqual(task2);

        const results = controller.getResults();
        expect(results.shortlist).toContain(task1);
        expect(results.notNow).not.toContain(task1);
    });

    it('should return null when all tasks triaged', async () => {
        const controller = new TriageController(mockApp, [task1]);
        await controller.swipeRight();
        expect(controller.getCurrentTask()).toBeNull();
    });

});
