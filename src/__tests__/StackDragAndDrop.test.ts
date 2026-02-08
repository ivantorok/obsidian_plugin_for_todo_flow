import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import StackView from '../views/StackView.svelte';
import { DEFAULT_KEYBINDINGS } from '../keybindings.js';
import { type TaskNode } from '../scheduler.js';
import { ToggleStatusCommand, ArchiveCommand, ToggleAnchorCommand, ReorderToIndexCommand } from '../commands/stack-commands.js';
import moment from 'moment';

const mockTasks: TaskNode[] = [
    { id: 'task-1', title: 'Task 1', duration: 30, status: 'todo', isAnchored: false, children: [] },
    { id: 'task-2', title: 'Task 2', duration: 30, status: 'todo', isAnchored: false, children: [] },
    { id: 'task-3', title: 'Task 3', duration: 30, status: 'todo', isAnchored: false, children: [] }
];

const baseSettings = {
    keys: DEFAULT_KEYBINDINGS,
    timingMode: 'now',
    swipeRightAction: 'complete',
    swipeLeftAction: 'archive',
    doubleTapAction: 'anchor',
    debug: false,
    enableShake: false
};

describe('StackView Drag & Drop TDD', () => {
    let historyManager: any;

    beforeEach(() => {
        historyManager = {
            executeCommand: vi.fn().mockResolvedValue(undefined),
            undo: vi.fn(),
            redo: vi.fn()
        };
        // Shim for happy-dom missing Pointer Capture
        if (!HTMLElement.prototype.setPointerCapture) {
            HTMLElement.prototype.setPointerCapture = vi.fn();
        }
        if (!HTMLElement.prototype.releasePointerCapture) {
            HTMLElement.prototype.releasePointerCapture = vi.fn();
        }
    });

    it('should update dragTargetIndex when dragging handle over other tasks', async () => {
        const { container } = render(StackView, {
            props: {
                initialTasks: mockTasks,
                settings: baseSettings as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,
                now: moment(),
                onOpenFile: vi.fn(),
                onTaskUpdate: vi.fn(),
                historyManager
            }
        });
        await tick();

        const cards = container.querySelectorAll('.todo-flow-task-card');
        const handle1 = cards[0]!.querySelector('.drag-handle') as HTMLElement;

        // Mock getBoundingClientRect
        cards.forEach((card, i) => {
            card.getBoundingClientRect = vi.fn(() => ({
                top: i * 100,
                bottom: (i + 1) * 100,
                left: 0,
                right: 300,
                width: 300,
                height: 100,
                x: 0,
                y: i * 100,
                toJSON: () => { }
            } as DOMRect));
        });

        await fireEvent.pointerDown(handle1, { clientY: 50, pointerId: 1 });
        await tick();

        await fireEvent.pointerMove(handle1, { clientY: 150, pointerId: 1 });
        await tick();

        expect(cards[1]!.classList.contains('drop-after')).toBe(true);

        await fireEvent.pointerMove(handle1, { clientY: 250, pointerId: 1 });
        await tick();
        expect(cards[2]!.classList.contains('drop-after')).toBe(true);

        await fireEvent.pointerUp(handle1, { clientY: 250, pointerId: 1 });
        await tick();

        expect(historyManager.executeCommand).toHaveBeenCalledWith(expect.any(ReorderToIndexCommand));
    });

    it('should trigger reordering when dragging the card body vertically', async () => {
        const { container } = render(StackView, {
            props: {
                initialTasks: mockTasks,
                settings: baseSettings as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,
                now: moment(),
                onOpenFile: vi.fn(),
                onTaskUpdate: vi.fn(),
                historyManager
            }
        });
        await tick();

        const cards = container.querySelectorAll('.todo-flow-task-card');
        const card1 = cards[0] as HTMLElement;

        // Mock getBoundingClientRect
        cards.forEach((card, i) => {
            card.getBoundingClientRect = vi.fn(() => ({
                top: i * 100,
                bottom: (i + 1) * 100,
                left: 0,
                right: 300,
                width: 300,
                height: 100,
                x: 0,
                y: i * 100,
                toJSON: () => { }
            } as DOMRect));
        });

        await fireEvent.pointerDown(card1, { clientX: 150, clientY: 50, pointerId: 1 });
        await tick();

        // Move vertically (lock to drag mode)
        await fireEvent.pointerMove(card1, { clientX: 150, clientY: 150, pointerId: 1 });
        await tick();

        expect(cards[1]!.classList.contains('drop-after')).toBe(true);

        await fireEvent.pointerUp(card1, { clientX: 150, clientY: 150, pointerId: 1 });
        await tick();

        expect(historyManager.executeCommand).toHaveBeenCalledWith(expect.any(ReorderToIndexCommand));
    });
    it('should NOT trigger navigation immediately after a drag', async () => {
        let instance: any;
        const { container, component } = render(StackView, {
            props: {
                initialTasks: mockTasks,
                settings: baseSettings as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,
                now: moment(),
                onOpenFile: vi.fn(),
                onTaskUpdate: vi.fn(),
                historyManager
            }
        });
        await tick();

        // Access controller via the exported function
        const controller = (component as any).getController();
        const handleEnterSpy = vi.spyOn(controller, 'handleEnter');

        const cards = container.querySelectorAll('.todo-flow-task-card');
        const card1 = cards[0] as HTMLElement;

        // Mock getBoundingClientRect
        cards.forEach((card, i) => {
            card.getBoundingClientRect = vi.fn(() => ({
                top: i * 100,
                bottom: (i + 1) * 100,
                left: 0,
                right: 300,
                width: 300,
                height: 100,
                x: 0,
                y: i * 100,
                toJSON: () => { }
            } as DOMRect));
        });

        // 1. Perform Drag
        await fireEvent.pointerDown(card1, { clientX: 150, clientY: 50, pointerId: 1 });
        await tick();
        await fireEvent.pointerMove(card1, { clientX: 150, clientY: 150, pointerId: 1 });
        await tick();
        await fireEvent.pointerUp(card1, { clientX: 150, clientY: 150, pointerId: 1 });
        await tick();

        // 2. Simulate the immediate native click that follows a drag
        await fireEvent.click(card1);
        await tick();

        // 3. Verify handleEnter was NOT called
        expect(handleEnterSpy).not.toHaveBeenCalled();
    });

    it('should target closest card even when in gap', async () => {
        let instance: any;
        const { container, component } = render(StackView, {
            props: {
                initialTasks: mockTasks,
                settings: baseSettings as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,
                now: moment(),
                onOpenFile: vi.fn(),
                onTaskUpdate: vi.fn(),
                historyManager
            }
        });
        await tick();

        const cards = container.querySelectorAll('.todo-flow-task-card');
        const card0 = cards[0]!;
        const card1 = cards[1]!;

        // Mock with gaps: Card 0 at 0-100, Card 1 at 150-250 (50px gap)
        card0.getBoundingClientRect = vi.fn(() => ({ top: 0, bottom: 100, height: 100 } as DOMRect));
        card1.getBoundingClientRect = vi.fn(() => ({ top: 150, bottom: 250, height: 100 } as DOMRect));

        // Start dragging card 0
        await fireEvent.pointerDown(card0, { clientX: 50, clientY: 50, pointerId: 1 });
        await tick();

        // Move to 130 (closer to card 1 which starts at 150, center 200)
        // Card 0 center: 50. Card 1 center: 200.
        // 130 is dist 80 from 0, dist 70 from 1. Should pick 1.
        await fireEvent.pointerMove(card0, { clientX: 50, clientY: 130, pointerId: 1 });
        await tick();

        // Release
        await fireEvent.pointerUp(card0, { clientX: 50, clientY: 130, pointerId: 1 });
        await tick();

        expect(historyManager.executeCommand).toHaveBeenCalledWith(expect.any(ReorderToIndexCommand));
        const callArgs = (historyManager.executeCommand as any).mock.calls[0][0];
        // Should swap 0 and 1
        expect(callArgs.newIndex).toBe(1);
    });

    it('should update focusedIndex after a successful drag-and-drop', async () => {
        const onOpenFile = vi.fn();
        const { container, component } = render(StackView, {
            props: {
                initialTasks: mockTasks,
                settings: baseSettings as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,
                now: moment(),
                onOpenFile,
                onTaskUpdate: vi.fn(),
                historyManager
            }
        });
        await tick();

        const cards = container.querySelectorAll('.todo-flow-task-card');
        const handle1 = cards[0]!.querySelector('.drag-handle') as HTMLElement;

        // Mock positions
        cards.forEach((card, i) => {
            card.getBoundingClientRect = vi.fn(() => ({
                top: i * 100,
                bottom: (i + 1) * 100,
                height: 100
            } as DOMRect));
        });

        // 1. Start dragging first task
        await fireEvent.pointerDown(handle1, { clientY: 50, pointerId: 1 });
        await tick();

        // 2. Move to second position (y=150)
        await fireEvent.pointerMove(handle1, { clientY: 150, pointerId: 1 });
        await tick();

        // 3. Drop
        await fireEvent.pointerUp(handle1, { clientY: 150, pointerId: 1 });
        await tick();

        // 4. Verify focusedIndex matches the new position (index 1)
        const focusedCard = container.querySelector('.todo-flow-task-card.is-focused');
        const taskCards = container.querySelectorAll('.todo-flow-task-card');

        // Find which index has the 'focused' class
        let focusedIndex = -1;
        taskCards.forEach((card, i) => {
            if (card.classList.contains('is-focused')) focusedIndex = i;
        });

        expect(focusedIndex).toBe(1);
    });
});
