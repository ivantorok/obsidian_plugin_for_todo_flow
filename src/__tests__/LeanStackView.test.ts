import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LeanStackViewSvelte from '../views/LeanStackView.svelte';
import type { TaskNode } from '../scheduler.js';
import { tick } from 'svelte';

describe('LeanStackView.svelte', () => {
    let mockTasks: TaskNode[];
    let mockOnTaskUpdate: any;
    let mockOnAppendInbox: any;
    let mockOnAppendStack: any;

    beforeEach(() => {
        mockTasks = [
            { id: 'task1', title: 'Task 1', duration: 30, status: 'todo', isAnchored: false, children: [] },
            { id: 'task2', title: 'Task 2', duration: 15, status: 'todo', isAnchored: false, children: [] }
        ] as any;
        mockOnTaskUpdate = vi.fn();
        mockOnAppendInbox = vi.fn();
        mockOnAppendStack = vi.fn();
    });

    it('should render the first task in the stack', async () => {
        const { component } = render(LeanStackViewSvelte, {
            props: {
                app: {} as any,
                settings: {} as any,
                logger: { info: vi.fn() } as any,
                onTaskUpdate: mockOnTaskUpdate,
                onAppendInbox: mockOnAppendInbox,
                onAppendStack: mockOnAppendStack
            }
        });

        component.setTasks(mockTasks);
        await tick();

        expect(screen.getByText('Task 1')).toBeTruthy();
        expect(screen.queryByText('Task 2')).toBeNull();
    });

    it('should call onTaskUpdate with done status when DONE is clicked', async () => {
        const { component } = render(LeanStackViewSvelte, {
            props: {
                app: {} as any,
                settings: {} as any,
                logger: { info: vi.fn() } as any,
                onTaskUpdate: mockOnTaskUpdate,
                onAppendInbox: mockOnAppendInbox,
                onAppendStack: mockOnAppendStack
            }
        });

        component.setTasks(mockTasks);
        await tick();

        const doneBtn = screen.getByText('DONE');
        await fireEvent.click(doneBtn);
        await tick();

        expect(mockOnTaskUpdate).toHaveBeenCalledWith(expect.objectContaining({
            id: 'task1',
            status: 'done'
        }));

        // Wait for re-render and check if next task is shown
        expect(screen.getByText('Task 2')).toBeTruthy();
    });

    it('should call onTaskUpdate with parked state when PARK is clicked', async () => {
        const { component } = render(LeanStackViewSvelte, {
            props: {
                app: {} as any,
                settings: {} as any,
                logger: { info: vi.fn() } as any,
                onTaskUpdate: mockOnTaskUpdate,
                onAppendInbox: mockOnAppendInbox,
                onAppendStack: mockOnAppendStack
            }
        });

        component.setTasks(mockTasks);
        await tick();

        const parkBtn = screen.getByText('PARK');
        await fireEvent.click(parkBtn);
        await tick();

        expect(mockOnTaskUpdate).toHaveBeenCalledWith(expect.objectContaining({
            id: 'task1',
            flow_state: 'parked'
        }));

        // Should move to next task
        expect(screen.getByText('Task 2')).toBeTruthy();
    });

    it('should handle thought capture via the FAB', async () => {
        render(LeanStackViewSvelte, {
            props: {
                app: {} as any,
                settings: {} as any,
                logger: { info: vi.fn() } as any,
                onTaskUpdate: mockOnTaskUpdate,
                onAppendInbox: mockOnAppendInbox,
                onAppendStack: mockOnAppendStack
            }
        });

        const fab = screen.getByText('+');
        await fireEvent.click(fab);
        await tick();

        const textarea = screen.getByPlaceholderText('Add to stack...');
        await fireEvent.input(textarea, { target: { value: 'Test capture' } });
        await tick();

        const captureBtn = screen.getByText('Add to Stack');
        await fireEvent.click(captureBtn);
        await tick();

        expect(mockOnAppendStack).toHaveBeenCalledWith('Test capture');
    });
});
