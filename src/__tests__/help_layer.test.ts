import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import StackView from '../views/StackView.svelte';
import { DEFAULT_KEYBINDINGS } from '../keybindings.js';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';

const mockTasks: TaskNode[] = [
    { id: '1', title: 'Task 1', duration: 30, status: 'todo', isAnchored: false, children: [] },
    { id: '2', title: 'Task 2', duration: 60, status: 'todo', isAnchored: false, children: [] }
];

describe('Feature: Help Layer', () => {
    it('should toggle help overlay on "?" keypress and block interaction', async () => {
        const historyManager = { push: vi.fn(), undo: vi.fn(), redo: vi.fn() } as any;
        const onNavigateSpy = vi.fn();

        const { container } = render(StackView, {
            props: {
                initialTasks: mockTasks,
                settings: { keys: { ...DEFAULT_KEYBINDINGS, toggleHelp: ['?'] }, timingMode: 'now' } as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,

                now: moment(),
                onOpenFile: vi.fn(),
                onNavigate: onNavigateSpy,
                onGoBack: vi.fn(),
                onTaskUpdate: vi.fn(),
                onTaskCreate: vi.fn(),
                historyManager
            }
        });
        await tick();

        const stackContainer = container.querySelector('.todo-flow-stack-container') as HTMLElement;
        stackContainer.focus();

        // 1. Initial State: No Help Modal
        expect(container.querySelector('.todo-flow-help-modal')).toBeNull();

        // 2. Press '?' (Toggle Help)
        await fireEvent.keyDown(stackContainer, { key: '?', code: 'Slash', shiftKey: true });
        await tick();

        // ASSERT: Modal is visible
        const modal = container.querySelector('.todo-flow-help-modal');
        expect(modal).not.toBeNull();
        expect(modal?.textContent).toContain('Keyboard Shortcuts');

        // 3. Attempt Interaction (Move Down 'j')
        // Initial focus is index 0. Pressing 'j' should move to index 1 IF allowed.
        await fireEvent.keyDown(stackContainer, { key: 'j', code: 'KeyJ' });
        await tick();
        await new Promise(resolve => setTimeout(resolve, 50)); // scroll delay

        // ASSERT: Focus did NOT move (still index 0)
        // Check selection visually (or via focused class)
        // Note: focus logic is DOM based in component.
        // If blocked, 'focusedIndex' stays 0.
        // We can check which element has .focused class.
        const focusedItems = container.querySelectorAll('.todo-flow-task-card.focused');
        expect(focusedItems.length).toBe(1);
        expect(focusedItems[0]?.textContent).toContain('Task 1'); // Should still be Task 1, NOT Task 2

        // 4. Press '?' again (Toggle Off)
        await fireEvent.keyDown(stackContainer, { key: '?', code: 'Slash', shiftKey: true });
        await tick();

        // ASSERT: Modal is gone
        expect(container.querySelector('.todo-flow-help-modal')).toBeNull();

        // 5. Interaction Resumes
        await fireEvent.keyDown(stackContainer, { key: 'j', code: 'KeyJ' });
        await tick();

        const newFocused = container.querySelector('.todo-flow-task-card.focused');
        expect(newFocused?.textContent).toContain('Task 2');
    });

    it('should close help on Escape', async () => {
        const historyManager = { push: vi.fn(), undo: vi.fn(), redo: vi.fn() } as any;

        const { container } = render(StackView, {
            props: {
                initialTasks: mockTasks,
                settings: { keys: { ...DEFAULT_KEYBINDINGS, toggleHelp: ['?'] }, timingMode: 'now' } as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,
                now: moment(),
                onOpenFile: vi.fn(),
                onNavigate: vi.fn(),
                onGoBack: vi.fn(),
                onTaskUpdate: vi.fn(),
                onTaskCreate: vi.fn(),
                historyManager
            }
        });
        await tick();

        const stackContainer = container.querySelector('.todo-flow-stack-container') as HTMLElement;
        stackContainer.focus();

        // Open Help
        await fireEvent.keyDown(stackContainer, { key: '?', code: 'Slash', shiftKey: true });
        await tick();
        expect(container.querySelector('.todo-flow-help-modal')).not.toBeNull();

        // Press Escape
        await fireEvent.keyDown(stackContainer, { key: 'Escape', code: 'Escape' });
        await tick();

        // Closed
        expect(container.querySelector('.todo-flow-help-modal')).toBeNull();
    });
});
