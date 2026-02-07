import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import StackView from '../views/StackView.svelte';
import { DEFAULT_KEYBINDINGS } from '../keybindings.js';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';

const mockTasks: TaskNode[] = [
    {
        id: 'parent',
        title: 'Parent Task',
        duration: 30,
        status: 'todo',
        isAnchored: false,
        children: [
            { id: 'child', title: 'Child Task', duration: 30, status: 'todo', isAnchored: false, children: [] }
        ]
    }
];

describe('Feature: Hierarchy Navigation', () => {
    it('should trigger onNavigate when drilling down (Enter)', async () => {
        const onNavigate = vi.fn();
        const { component, container } = render(StackView, {
            props: {
                initialTasks: mockTasks,
                settings: { keys: DEFAULT_KEYBINDINGS, timingMode: 'now' } as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,
                now: moment(),
                onOpenFile: vi.fn(),
                onNavigate: onNavigate,
                onGoBack: vi.fn(),
                onTaskUpdate: vi.fn(),
                onTaskCreate: vi.fn(),
                historyManager: { push: vi.fn(), undo: vi.fn(), redo: vi.fn() } as any
            }
        });
        await tick();

        const stackContainer = container.querySelector('.todo-flow-stack-container') as HTMLElement;
        stackContainer.focus();

        // 1. Focus Parent
        // (Default is index 0)

        // 2. Press Enter (Drill Down)
        // Note: handleEnter returns { action: 'DRILL_DOWN' } if children exist.
        // StackView handles this by calling onNavigate(parentId).
        // @ts-ignore
        const eventE = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter' });
        Object.defineProperty(eventE, 'target', { value: stackContainer });
        // @ts-ignore
        component.handleKeyDown(eventE);
        await tick();

        // ASSERT: onNavigate called with Parent ID
        expect(onNavigate).toHaveBeenCalledWith('parent', 0);
    });

    it('should trigger onGoBack when pressing h', async () => {
        const onGoBack = vi.fn();
        const { component, container } = render(StackView, {
            props: {
                initialTasks: mockTasks,
                settings: { keys: DEFAULT_KEYBINDINGS, timingMode: 'now' } as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,
                now: moment(),
                onOpenFile: vi.fn(),
                onNavigate: vi.fn(),
                onGoBack: onGoBack,
                onTaskUpdate: vi.fn(),
                onTaskCreate: vi.fn(),
                historyManager: { push: vi.fn(), undo: vi.fn(), redo: vi.fn() } as any
            }
        });
        await tick();

        const stackContainer = container.querySelector('.todo-flow-stack-container') as HTMLElement;
        stackContainer.focus();

        // 1. Press h (Go Back)
        // @ts-ignore
        const eventH = new KeyboardEvent('keydown', { key: 'h', code: 'KeyH' });
        Object.defineProperty(eventH, 'target', { value: stackContainer });
        // @ts-ignore
        component.handleKeyDown(eventH);
        await tick();

        // ASSERT: onGoBack called
        expect(onGoBack).toHaveBeenCalled();
    });
});
