import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import StackView from '../views/StackView.svelte';
import { DEFAULT_KEYBINDINGS } from '../keybindings.js';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';
import { ToggleStatusCommand, ArchiveCommand, ToggleAnchorCommand } from '../commands/stack-commands.js';

const mockTasks: TaskNode[] = [
    { id: 'task-1', title: 'Task 1', duration: 30, status: 'todo', isAnchored: false, children: [] },
    { id: 'task-2', title: 'Task 2', duration: 30, status: 'todo', isAnchored: false, children: [] }
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

describe('StackView Mobile Gestures Integration', () => {
    let historyManager: any;

    beforeEach(() => {
        (window as any).Notice = vi.fn();
        // Shim for happy-dom missing Pointer Capture
        if (!HTMLElement.prototype.setPointerCapture) {
            HTMLElement.prototype.setPointerCapture = vi.fn();
        }
        if (!HTMLElement.prototype.releasePointerCapture) {
            HTMLElement.prototype.releasePointerCapture = vi.fn();
        }

        historyManager = {
            executeCommand: vi.fn().mockResolvedValue(undefined),
            undo: vi.fn(),
            redo: vi.fn()
        };
    });

    it('should trigger ToggleStatusCommand on right swipe', async () => {
        const onTaskUpdate = vi.fn();
        const { container } = render(StackView, {
            props: {
                initialTasks: mockTasks,
                settings: baseSettings as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,
                now: moment(),
                onOpenFile: vi.fn(),
                onTaskUpdate,
                historyManager
            }
        });
        await tick();

        const card = container.querySelector('.todo-flow-task-card') as HTMLElement;

        // Simulate Swipe Right (Delta > 100)
        await fireEvent.pointerDown(card, { clientX: 100, pointerId: 1 });
        await fireEvent.pointerMove(card, { clientX: 250, pointerId: 1 });
        await fireEvent.pointerUp(card, { clientX: 250, pointerId: 1 });

        // Verify Command
        expect(historyManager.executeCommand).toHaveBeenCalledWith(expect.any(ToggleStatusCommand));
        const cmd = historyManager.executeCommand.mock.calls[0][0];
        expect(cmd.index).toBe(0);
    });

    it('should trigger ArchiveCommand on left swipe', async () => {
        const onTaskUpdate = vi.fn();
        const { container } = render(StackView, {
            props: {
                initialTasks: mockTasks,
                settings: baseSettings as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,
                now: moment(),
                onOpenFile: vi.fn(),
                onTaskUpdate,
                historyManager
            }
        });
        await tick();

        const card = container.querySelector('.todo-flow-task-card') as HTMLElement;

        // Simulate Swipe Left (Delta < -100)
        await fireEvent.pointerDown(card, { clientX: 300, pointerId: 1 });
        await fireEvent.pointerMove(card, { clientX: 150, pointerId: 1 });
        await fireEvent.pointerUp(card, { clientX: 150, pointerId: 1 });

        // Verify Command
        expect(historyManager.executeCommand).toHaveBeenCalledWith(expect.any(ArchiveCommand));
        const cmd = historyManager.executeCommand.mock.calls[0][0];
        expect(cmd.index).toBe(0);
    });

    it('should trigger ToggleAnchorCommand on double tap and maintain focus', async () => {
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

        const card = container.querySelector('.todo-flow-task-card') as HTMLElement;

        // Mock Command Result (Part of BUG-020 Fix)
        historyManager.executeCommand.mockImplementation(async (cmd: any) => {
            if (cmd instanceof ToggleAnchorCommand) {
                cmd.resultIndex = 0; // Simulate anchored task staying at index 0
            }
            return Promise.resolve();
        });

        // Simulate Double Tap
        await fireEvent.click(card);
        // Second tap within 300ms
        await new Promise(r => setTimeout(r, 100));
        await fireEvent.click(card);
        await tick();

        // Verify Command
        expect(historyManager.executeCommand).toHaveBeenCalledWith(expect.any(ToggleAnchorCommand));
        const cmd = historyManager.executeCommand.mock.calls[0][0];
        expect(cmd.index).toBe(0);

        // Verification for BUG-020: Focus should persist on the task
        expect(card.classList.contains('is-focused')).toBe(true);
    });

    it('should stop event propagation during gestures (Gesture Shadowing)', async () => {
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

        const card = container.querySelector('.todo-flow-task-card') as HTMLElement;

        // Mock Event with stopPropagation spy
        const stopPropagationSpy = vi.fn();
        const startEvent = new TouchEvent('touchstart', {
            touches: [{ clientX: 100, clientY: 100 } as any],
            bubbles: true,
            cancelable: true
        });
        startEvent.stopPropagation = stopPropagationSpy;

        const moveEvent = new TouchEvent('touchmove', {
            touches: [{ clientX: 250, clientY: 100 } as any], // +150px (Right Swipe)
            bubbles: true,
            cancelable: true
        });
        moveEvent.stopPropagation = stopPropagationSpy;

        // Dispatch Events manually to control the Event object
        // 1. TOUCH START
        card.dispatchEvent(startEvent);
        await tick();

        // EXPECTATION (Red): touchstart MUST stop propagation to prevent Obsidian from seeing the start of a swipe
        expect(stopPropagationSpy).toHaveBeenCalled();
        stopPropagationSpy.mockClear();

        // 2. TOUCH MOVE
        card.dispatchEvent(moveEvent);
        await tick();

        // EXPECTATION: touchmove should also stop propagation
        expect(stopPropagationSpy).toHaveBeenCalled();
    });
});
