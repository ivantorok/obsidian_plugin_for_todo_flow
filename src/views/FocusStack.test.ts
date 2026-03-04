
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import FocusStack from './FocusStack.svelte';
import moment from 'moment';

describe('FocusStack Hard Shell', () => {
    const mockTask = {
        id: 'vault/tasks/Task1.md',
        title: 'Task1',
        status: 'todo',
        duration: 30,
        isAnchored: false,
        children: []
    };

    const mockNavState = {
        tasks: [mockTask],
        focusedIndex: 0,
        viewMode: 'focus',
        isMobile: true
    };

    it('should render the task title or a fallback', () => {
        const { container } = render(FocusStack, {
            props: {
                navState: mockNavState,
                controller: { tasks: [mockTask], now: moment() } as any,
                executeGestureAction: vi.fn(),
                isSyncing: false,
                isPersistenceIdle: true,
                now: moment()
            }
        });

        const titleEl = container.querySelector('.focus-title');
        expect(titleEl).not.toBeNull();
        expect(titleEl?.textContent?.trim()).toBe('Task1');
    });

    it('should use a fallback from ID if title is empty', () => {
        const emptyTask = { ...mockTask, title: '' };
        render(FocusStack, {
            props: {
                navState: { ...mockNavState, tasks: [emptyTask] },
                controller: { tasks: [emptyTask], now: moment() } as any,
                executeGestureAction: vi.fn(),
                isSyncing: false,
                isPersistenceIdle: true,
                now: moment()
            }
        });

        const titleEl = screen.getByText('Task1');
        expect(titleEl).toBeDefined();
    });
});
