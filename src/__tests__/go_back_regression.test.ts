import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import StackView from '../views/StackView.svelte';
import { DEFAULT_KEYBINDINGS } from '../keybindings.js';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';

describe('Go Back Regression: Empty Screen Bug 🔙', () => {
    beforeEach(() => {
        (window as any).Notice = vi.fn();
    });

    it('should show parent tasks after drilling down and going back', async () => {
        const { HistoryManager } = await import('../history.js');
        const historyManager = new HistoryManager();

        // Setup: Parent task with children
        const parentTask: TaskNode = {
            id: 'parent.md',
            title: 'Parent Task',
            duration: 60,
            status: 'todo',
            isAnchored: false,
            children: [
                { id: 'child1.md', title: 'Child 1', duration: 30, status: 'todo', isAnchored: false, children: [] },
                { id: 'child2.md', title: 'Child 2', duration: 30, status: 'todo', isAnchored: false, children: [] }
            ]
        };

        const onNavigateSpy = vi.fn();
        const onGoBackSpy = vi.fn();

        const { container } = render(StackView, {
            props: {
                initialTasks: [parentTask],
                settings: { keys: DEFAULT_KEYBINDINGS, timingMode: 'now' } as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,
                now: moment(),
                onOpenFile: vi.fn(),
                onNavigate: onNavigateSpy,
                onGoBack: onGoBackSpy,
                onTaskUpdate: vi.fn(),
                onTaskCreate: vi.fn(),
                historyManager
            }
        });
        await tick();

        const stackContainer = container.querySelector('.todo-flow-stack-container') as HTMLElement;
        stackContainer.focus();

        // STEP 1: Verify we see the parent task initially
        let tasks = container.querySelectorAll('.todo-flow-task-card');
        expect(tasks.length).toBe(1);
        expect(container.textContent).toContain('Parent Task');

        // STEP 2: Press Enter to drill down into children
        await fireEvent.keyDown(stackContainer, { key: 'Enter', code: 'Enter' });
        await tick();
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify onNavigate was called
        expect(onNavigateSpy).toHaveBeenCalledWith('parent.md', 0);

        // STEP 3: Simulate the navigation callback updating the view
        // In the real app, StackView.ts calls component.setTasks() with the children
        // We need to simulate this behavior
        // For now, let's just verify the callback was triggered

        // STEP 4: Press 'h' to go back
        await fireEvent.keyDown(stackContainer, { key: 'h', code: 'KeyH' });
        await tick();
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify onGoBack was called
        expect(onGoBackSpy).toHaveBeenCalled();

        // STEP 5: CRITICAL ASSERTION - Screen should NOT be empty
        // After going back, we should see the parent task again
        tasks = container.querySelectorAll('.todo-flow-task-card');

        // This is the regression: tasks.length will be 0 (empty screen)
        expect(tasks.length).toBeGreaterThan(0);
        expect(container.textContent).toContain('Parent Task');
    });

    it('should maintain task state after go back', async () => {
        const { HistoryManager } = await import('../history.js');
        const historyManager = new HistoryManager();

        const tasks: TaskNode[] = [
            {
                id: 'task1.md',
                title: 'Task 1',
                duration: 30,
                status: 'todo',
                isAnchored: false,
                children: [
                    { id: 'subtask.md', title: 'Subtask', duration: 15, status: 'todo', isAnchored: false, children: [] }
                ]
            },
            {
                id: 'task2.md',
                title: 'Task 2',
                duration: 30,
                status: 'todo',
                isAnchored: false,
                children: []
            }
        ];

        const onNavigateSpy = vi.fn();
        const onGoBackSpy = vi.fn();

        const { container } = render(StackView, {
            props: {
                initialTasks: tasks,
                settings: { keys: DEFAULT_KEYBINDINGS, timingMode: 'now' } as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,
                now: moment(),
                onOpenFile: vi.fn(),
                onNavigate: onNavigateSpy,
                onGoBack: onGoBackSpy,
                onTaskUpdate: vi.fn(),
                onTaskCreate: vi.fn(),
                historyManager
            }
        });
        await tick();

        const stackContainer = container.querySelector('.todo-flow-stack-container') as HTMLElement;
        stackContainer.focus();

        // Initial state: 2 tasks
        let taskCards = container.querySelectorAll('.todo-flow-task-card');
        expect(taskCards.length).toBe(2);

        // Drill down into Task 1
        await fireEvent.keyDown(stackContainer, { key: 'Enter', code: 'Enter' });
        await tick();

        // Go back
        await fireEvent.keyDown(stackContainer, { key: 'h', code: 'KeyH' });
        await tick();
        await new Promise(resolve => setTimeout(resolve, 100));

        // Should still have 2 tasks
        taskCards = container.querySelectorAll('.todo-flow-task-card');
        expect(taskCards.length).toBe(2);
        expect(container.textContent).toContain('Task 1');
        expect(container.textContent).toContain('Task 2');
    });
});
