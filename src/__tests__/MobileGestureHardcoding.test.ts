import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import StackView from '../views/StackView.svelte';
import { DEFAULT_KEYBINDINGS } from '../keybindings.js';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';
import { ToggleStatusCommand, ArchiveCommand, ToggleAnchorCommand } from '../commands/stack-commands.js';

const mockTasks: TaskNode[] = [
    { id: 'task-1', title: 'Task 1', duration: 30, status: 'todo', isAnchored: false, children: [] }
];

const conflictingSettings = {
    keys: DEFAULT_KEYBINDINGS,
    timingMode: 'now',
    swipeRightAction: 'none', // CONFLICT: Should be 'complete' on mobile
    swipeLeftAction: 'none',  // CONFLICT: Should be 'archive' on mobile
    doubleTapAction: 'none',  // CONFLICT: Should be 'anchor' on mobile
    debug: false,
    enableShake: false
};

describe('Mobile Gesture Hardcoding (TDD Verification)', () => {
    let historyManager: any;

    beforeEach(() => {
        (window as any).Notice = class { constructor() { } };
        // Shim for happy-dom missing Pointer Capture
        if (!HTMLElement.prototype.setPointerCapture) {
            HTMLElement.prototype.setPointerCapture = vi.fn();
        }
        if (!HTMLElement.prototype.releasePointerCapture) {
            HTMLElement.prototype.releasePointerCapture = vi.fn();
        }

        historyManager = {
            executeCommand: vi.fn().mockImplementation(async (cmd: any) => Promise.resolve()),
            undo: vi.fn(),
            redo: vi.fn()
        };
    });

    it('should override settings.swipeRightAction on mobile and trigger "complete"', async () => {
        const { container } = render(StackView, {
            props: {
                initialTasks: mockTasks,
                settings: conflictingSettings as any,
                navState: { isMobile: true, tasks: mockTasks, focusedIndex: 0 } as any,
                historyManager
            }
        });
        await tick();

        const card = container.querySelector('.todo-flow-task-card') as HTMLElement;

        // Swipe Right
        await fireEvent.pointerDown(card, { clientX: 100, pointerId: 1 });
        await fireEvent.pointerMove(card, { clientX: 250, pointerId: 1 });
        await fireEvent.pointerUp(card, { clientX: 250, pointerId: 1 });

        // EXPECTATION: Should trigger ToggleStatusCommand (complete) despite settings being 'none'
        expect(historyManager.executeCommand).toHaveBeenCalledWith(expect.any(ToggleStatusCommand));
    });

    it('should override settings.swipeLeftAction on mobile and trigger "archive"', async () => {
        const { container } = render(StackView, {
            props: {
                initialTasks: mockTasks,
                settings: conflictingSettings as any,
                navState: { isMobile: true, tasks: mockTasks, focusedIndex: 0 } as any,
                historyManager
            }
        });
        await tick();

        const card = container.querySelector('.todo-flow-task-card') as HTMLElement;

        // Swipe Left
        await fireEvent.pointerDown(card, { clientX: 300, pointerId: 1 });
        await fireEvent.pointerMove(card, { clientX: 150, pointerId: 1 });
        await fireEvent.pointerUp(card, { clientX: 150, pointerId: 1 });

        // EXPECTATION: Should trigger ArchiveCommand despite settings being 'none'
        expect(historyManager.executeCommand).toHaveBeenCalledWith(expect.any(ArchiveCommand));
    });

    it('should override settings.doubleTapAction on mobile and trigger "anchor"', async () => {
        const { container } = render(StackView, {
            props: {
                initialTasks: mockTasks,
                settings: conflictingSettings as any,
                navState: { isMobile: true, tasks: mockTasks, focusedIndex: 0 } as any,
                historyManager
            }
        });
        await tick();

        const card = container.querySelector('.todo-flow-task-card') as HTMLElement;

        // Double Tap
        await fireEvent.click(card);
        await new Promise(r => setTimeout(r, 100));
        await fireEvent.click(card);
        await tick();

        // EXPECTATION: Should trigger ToggleAnchorCommand despite settings being 'none'
        expect(historyManager.executeCommand).toHaveBeenCalledWith(expect.any(ToggleAnchorCommand));
    });
});
