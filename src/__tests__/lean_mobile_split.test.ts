import { test, expect, describe, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, tick } from 'svelte';
import StackView from '../views/StackView.svelte';
import FocusStack from '../views/FocusStackHardShell.svelte';
import { HistoryManager } from '../history.js';
import { FileLogger } from '../logger.js';
import moment from 'moment';
import { type TodoFlowSettings } from '../settings.js';

function createMockTask(id: string, title: string, status: string, duration: number, children: any[] = []) {
    return {
        id,
        title,
        status,
        duration,
        originalDuration: duration,
        isAnchored: false,
        startTime: moment(),
        children
    };
}

describe('FEAT-009 Lean Mobile Split Validation (Skeptical Specs)', () => {
    let container: HTMLElement;
    let component: any;
    let historyManager: HistoryManager;
    let logger: FileLogger;
    let dummyTasks: any[];

    const defaultSettings: TodoFlowSettings = {
        targetFolder: '',
        exportFolder: '',
        timingMode: 'now',
        fixedStartTime: '09:00',
        enableShake: false,
        traceVaultEvents: false,
        maxGraphDepth: 5,
        absoluteLogPath: '',
        swipeLeftAction: 'archive',
        swipeRightAction: 'complete',
        doubleTapAction: 'anchor',
        longPressAction: 'none',
        keys: {
            navUp: ['k'],
            navDown: ['j'],
            moveUp: ['K'],
            moveDown: ['J'],
            anchor: ['Shift+F'],
            durationUp: ['f'],
            durationDown: ['d'],
            undo: ['u'],
            redo: ['Shift+U'],
            confirm: ['Enter'],
            cancel: ['Escape'],
            toggleDone: ['x'],
            createTask: ['c'],
            deleteTask: ['Backspace'],
            forceOpen: ['Shift+Enter'],
            goBack: ['h'],
            export: ['Shift+E'],
            rename: ['e'],
            archive: ['z'],
            quickAdd: [],
            editStartTime: ['s'],
            toggleHelp: ['?']
        },
        debug: false
    };

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        historyManager = new HistoryManager();
        logger = new FileLogger({ vault: { adapter: { append: vi.fn(), write: vi.fn(), exists: vi.fn().mockResolvedValue(true), mkdir: vi.fn().mockResolvedValue(true) } } } as any, false, 'dummy.log');

        dummyTasks = [
            createMockTask('task-1', 'Task 1', 'todo', 30),
            createMockTask('task-2', 'Task 2', 'todo', 45),
            createMockTask('task-3', 'Task 3', 'todo', 60)
        ];
    });

    afterEach(() => {
        if (component) {
            unmount(component);
        }
        container.remove();
        vi.restoreAllMocks();
    });

    function mountComponent(tasks = dummyTasks, isMobile = false) {
        component = mount(StackView, {
            target: container,
            props: {
                initialTasks: tasks,
                settings: defaultSettings,
                historyManager,
                logger,
                now: moment('2025-01-01 10:00:00'),
                navState: {
                    tasks: tasks,
                    focusedIndex: 0,
                    parentTaskName: null,
                    canGoBack: false,
                    rootPath: null,
                    isMobile: isMobile
                }
            }
        });
        return component;
    }

    test('E2E Test 1: The Memory Leak / Swap Spam Check', async () => {
        component = mountComponent();

        // Ensure starting in Architect mode
        expect(container.querySelector('[data-view-type="architect"]')).not.toBeNull();
        expect(container.querySelector('[data-view-type="focus"]')).toBeNull();

        // Spam the mode switch
        for (let i = 0; i < 10; i++) {
            component.setViewMode('focus');
            await tick();
            component.setViewMode('architect');
            await tick();
        }

        // Leave it in Focus mode
        component.setViewMode('focus');
        await tick();

        // ASSERTION: Architect mode must be completely removed from DOM
        expect(container.querySelector('[data-view-type="architect"]')).toBeNull();

        // ASSERTION: Only one Focus card should exist (no orphan renders)
        const focusCards = container.querySelectorAll('[data-testid="focus-card"]');
        expect(focusCards.length).toBe(1);
    });

    test('E2E Test 2: State Preservation Check (The Baton)', async () => {
        component = mountComponent();

        // Start in Architect mode, focus Task 3 (index 2)
        component.setFocus(2);
        await tick();

        // Verify Architect mode reflects focus
        const architectElements = container.querySelectorAll('.todo-flow-task-card');
        expect(architectElements[2].classList.contains('is-focused')).toBe(true);
        expect(component.getFocusedIndex()).toBe(2);

        // Switch to Focus mode
        component.setViewMode('focus');
        await tick();

        // ASSERTION: The newly mounted FocusStack MUST render Task 3 immediately
        const indexDisplay = container.querySelector('.index-display');
        expect(indexDisplay?.textContent).toBe('#3 of 3');

        const titleEl = container.querySelector('.focus-title');
        expect(titleEl?.textContent).toBe('Task 3');

        // The internal state should still say index 2
        expect(component.getFocusedIndex()).toBe(2);
    });

    test('E2E Test 3: Title Tap Opens Detailed View (Hard Shell Contract)', async () => {
        component = mountComponent(dummyTasks, true);

        // Switch to focus mode
        component.setViewMode('focus');
        await tick();
        await tick();

        // Verify Focus mode is active
        const titleEl = container.querySelector('.focus-title') as HTMLElement;
        expect(titleEl?.textContent).toBe('Task 1');

        // Tap Title
        titleEl.click();
        await tick();
        await tick();

        // ASSERTION: DetailedTaskView should now be visible in StackView
        const detailedView = container.querySelector('.todo-flow-detailed-view');
        expect(detailedView).not.toBeNull();
    });
});
