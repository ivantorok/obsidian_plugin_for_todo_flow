import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, tick } from 'svelte';
import ArchitectStack from '../views/ArchitectStack.svelte';
import { type TaskNode } from '../scheduler.js';
import { ReorderToIndexCommand } from '../commands/stack-commands.js';
import moment from 'moment';

const mockTasks: TaskNode[] = [
    { id: 'task-1', title: 'Task 1', duration: 30, status: 'todo', isAnchored: false, children: [] },
    { id: 'task-2', title: 'Task 2', duration: 30, status: 'todo', isAnchored: false, children: [] },
    { id: 'task-3', title: 'Task 3', duration: 30, status: 'todo', isAnchored: false, children: [] }
];

const baseSettings = {
    keys: { confirm: ['Enter'], cancel: ['Escape'], navUp: ['k'], navDown: ['j'] },
    timingMode: 'now',
    swipeRightAction: 'complete',
    swipeLeftAction: 'archive',
    doubleTapAction: 'anchor',
    debug: false,
    enableShake: false
};

describe.skip('ArchitectStack Drag & Drop TDD', () => {
    let container: HTMLElement;
    let component: any;
    let historyManager: any;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);

        historyManager = {
            executeCommand: vi.fn().mockResolvedValue(undefined),
            undo: vi.fn(),
            redo: vi.fn()
        };

        if (!HTMLElement.prototype.setPointerCapture) {
            HTMLElement.prototype.setPointerCapture = vi.fn();
        }
        if (!HTMLElement.prototype.releasePointerCapture) {
            HTMLElement.prototype.releasePointerCapture = vi.fn();
        }
    });

    afterEach(() => {
        if (component) unmount(component);
        container.remove();
        vi.restoreAllMocks();
    });

    it('should update dragTargetIndex when dragging handle over other tasks', async () => {
        component = mount(ArchitectStack, {
            target: container,
            props: {
                settings: baseSettings as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,
                now: moment(),
                onOpenFile: vi.fn(),
                onTaskUpdate: vi.fn(),
                historyManager,
                navState: {
                    tasks: [...mockTasks],
                    focusedIndex: 0,
                    parentTaskName: null,
                    canGoBack: false,
                    rootPath: null,
                    isMobile: false
                }
            }
        });
        await tick();

        const cards = container.querySelectorAll('.todo-flow-task-card') as NodeListOf<HTMLElement>;
        expect(cards.length).toBe(3);
        const handle1 = cards[0]!.querySelector('.drag-handle') as HTMLElement;

        cards.forEach((card, i) => {
            card.getBoundingClientRect = vi.fn(() => ({
                top: i * 100, bottom: (i + 1) * 100, left: 0, right: 300, width: 300, height: 100
            } as any));
        });

        handle1.dispatchEvent(new PointerEvent('pointerdown', { clientX: 10, clientY: 50, pointerId: 1, bubbles: true, isPrimary: true }));
        await tick();

        handle1.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 150, pointerId: 1, bubbles: true, isPrimary: true }));
        await tick();

        expect(cards[1]!.classList.contains('drop-after')).toBe(true);

        handle1.dispatchEvent(new PointerEvent('pointerup', { clientX: 10, clientY: 150, pointerId: 1, bubbles: true, isPrimary: true }));
        await tick();

        expect(historyManager.executeCommand).toHaveBeenCalledWith(expect.any(ReorderToIndexCommand));
    });

    it('should trigger reordering when dragging the card body vertically', async () => {
        component = mount(ArchitectStack, {
            target: container,
            props: {
                settings: baseSettings as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,
                now: moment(),
                onOpenFile: vi.fn(),
                onTaskUpdate: vi.fn(),
                historyManager,
                navState: {
                    tasks: [...mockTasks],
                    focusedIndex: 0,
                    parentTaskName: null,
                    canGoBack: false,
                    rootPath: null,
                    isMobile: false
                }
            }
        });
        await tick();

        const cards = container.querySelectorAll('.todo-flow-task-card') as NodeListOf<HTMLElement>;
        const card1 = cards[0] as HTMLElement;

        cards.forEach((card, i) => {
            card.getBoundingClientRect = vi.fn(() => ({
                top: i * 100, bottom: (i + 1) * 100, left: 0, right: 300, width: 300, height: 100
            } as any));
        });

        card1.dispatchEvent(new PointerEvent('pointerdown', { clientX: 150, clientY: 50, pointerId: 1, bubbles: true, isPrimary: true }));
        await tick();

        card1.dispatchEvent(new PointerEvent('pointermove', { clientX: 150, clientY: 150, pointerId: 1, bubbles: true, isPrimary: true }));
        await tick();

        expect(cards[1]!.classList.contains('drop-after')).toBe(true);

        card1.dispatchEvent(new PointerEvent('pointerup', { clientX: 150, clientY: 150, pointerId: 1, bubbles: true, isPrimary: true }));
        await tick();

        expect(historyManager.executeCommand).toHaveBeenCalledWith(expect.any(ReorderToIndexCommand));
    });

    it('should NOT trigger navigation immediately after a drag', async () => {
        component = mount(ArchitectStack, {
            target: container,
            props: {
                settings: baseSettings as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,
                now: moment(),
                onOpenFile: vi.fn(),
                onTaskUpdate: vi.fn(),
                historyManager,
                navState: {
                    tasks: [...mockTasks],
                    focusedIndex: 0,
                    parentTaskName: null,
                    canGoBack: false,
                    rootPath: null,
                    isMobile: false
                }
            }
        });
        await tick();

        const controller = component.getController();
        const handleEnterSpy = vi.spyOn(controller, 'handleEnter');

        const cards = container.querySelectorAll('.todo-flow-task-card') as NodeListOf<HTMLElement>;
        const card1 = cards[0] as HTMLElement;

        cards.forEach((card, i) => {
            card.getBoundingClientRect = vi.fn(() => ({
                top: i * 100, bottom: (i + 1) * 100, height: 100
            } as any));
        });

        card1.dispatchEvent(new PointerEvent('pointerdown', { clientX: 150, clientY: 50, pointerId: 1, bubbles: true, isPrimary: true }));
        await tick();
        card1.dispatchEvent(new PointerEvent('pointermove', { clientX: 150, clientY: 150, pointerId: 1, bubbles: true, isPrimary: true }));
        await tick();
        card1.dispatchEvent(new PointerEvent('pointerup', { clientX: 150, clientY: 150, pointerId: 1, bubbles: true, isPrimary: true }));
        await tick();

        card1.click();
        await tick();

        expect(handleEnterSpy).not.toHaveBeenCalled();
    });

    it('should update focusedIndex after a successful drag-and-drop', async () => {
        component = mount(ArchitectStack, {
            target: container,
            props: {
                settings: baseSettings as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,
                now: moment(),
                onOpenFile: vi.fn(),
                onTaskUpdate: vi.fn(),
                historyManager,
                navState: {
                    tasks: [...mockTasks],
                    focusedIndex: 0,
                    parentTaskName: null,
                    canGoBack: false,
                    rootPath: null,
                    isMobile: false
                }
            }
        });
        await tick();

        const cards = container.querySelectorAll('.todo-flow-task-card') as NodeListOf<HTMLElement>;
        const handle1 = cards[0]!.querySelector('.drag-handle') as HTMLElement;

        cards.forEach((card, i) => {
            card.getBoundingClientRect = vi.fn(() => ({
                top: i * 100, bottom: (i + 1) * 100, height: 100
            } as any));
        });

        handle1.dispatchEvent(new PointerEvent('pointerdown', { clientY: 50, pointerId: 1, bubbles: true, isPrimary: true }));
        await tick();
        handle1.dispatchEvent(new PointerEvent('pointermove', { clientY: 150, pointerId: 1, bubbles: true, isPrimary: true }));
        await tick();
        handle1.dispatchEvent(new PointerEvent('pointerup', { clientY: 150, pointerId: 1, bubbles: true, isPrimary: true }));
        await tick();

        const updatedCards = container.querySelectorAll('.todo-flow-task-card');
        expect(updatedCards[1].classList.contains('is-focused')).toBe(true);
    });
});
