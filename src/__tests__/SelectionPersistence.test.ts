
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock Obsidian modules
vi.mock('obsidian', () => ({
    ItemView: class {
        constructor(public leaf: any) { }
        async setState(state: any, result: any) { }
    },
    WorkspaceLeaf: class { },
    TFile: class { },
    FuzzySuggestModal: class { constructor(public app: any) { }; setPlaceholder() { }; open() { }; close() { }; },
    Modal: class { constructor(public app: any) { }; open() { }; close() { }; },
    Scope: class { register = vi.fn(); unregister = vi.fn(); },
    Plugin: class { },
    moment: () => ({ format: () => '2026-01-01' })
}));

// 2. Mock svelte
vi.mock('svelte', () => ({
    mount: vi.fn(),
    unmount: vi.fn()
}));

// 3. Hoisted Mocks
const mocks = vi.hoisted(() => ({
    loader: {
        load: vi.fn().mockResolvedValue([]),
        loadShortlisted: vi.fn().mockResolvedValue([]),
        loadSpecificFiles: vi.fn().mockResolvedValue([]),
        parser: { resolveTaskMetadata: vi.fn().mockImplementation((id) => ({ id, title: 'Mock Title', duration: 30, status: 'todo', isAnchored: false })) }
    },
    navManager: {
        setStack: vi.fn(),
        getCurrentStack: vi.fn().mockReturnValue([]),
        drillDown: vi.fn(),
        goBack: vi.fn(),
        getState: vi.fn().mockReturnValue({ history: [], currentSource: '' }),
        setState: vi.fn()
    },
    component: {
        setTasks: vi.fn(),
        setFocus: vi.fn(),
        getFocusedIndex: vi.fn(), // Add this
        updateSettings: vi.fn(),
        updateNow: vi.fn(),
        $destroy: vi.fn()
    }
}));

vi.mock('../loaders/StackLoader.js', () => ({
    StackLoader: class {
        load = mocks.loader.load;
        loadShortlisted = mocks.loader.loadShortlisted;
        loadSpecificFiles = mocks.loader.loadSpecificFiles;
        parser = mocks.loader.parser;
    }
}));

vi.mock('../navigation/NavigationManager.js', () => ({
    NavigationManager: class {
        setStack = mocks.navManager.setStack;
        getCurrentStack = mocks.navManager.getCurrentStack;
        drillDown = mocks.navManager.drillDown;
        goBack = mocks.navManager.goBack;
        getState = mocks.navManager.getState;
        setState = mocks.navManager.setState;
    }
}));

vi.mock('../scheduler.js', () => ({
    computeSchedule: vi.fn().mockImplementation((tasks) => tasks) // Pass through tasks for simple testing
}));

vi.mock('../main.js', () => ({
    TodoFlowPlugin: class { },
    DEFAULT_SETTINGS: {}
}));

import { StackView } from '../views/StackView.js';

describe('StackView Selection Persistence', () => {
    let view: StackView;
    let mockLeaf: any;
    let mockSettings: any;
    let mockHistory: any;
    let mockLogger: any;

    beforeEach(() => {
        mockLeaf = {};
        mockSettings = { timingMode: 'now', keys: { debug: false } };
        mockHistory = {};
        mockLogger = { info: vi.fn(), warn: vi.fn() };

        vi.clearAllMocks();

        view = new StackView(mockLeaf, mockSettings, mockHistory, mockLogger, { saveStack: vi.fn(), loadStackIds: vi.fn() } as any, vi.fn(), vi.fn());

        // Manual component mount mock since we can't fully mock Svelte lifecycle easily here
        view.component = mocks.component;
    });

    it('should restore focus to the same task ID even if its index changes', async () => {
        // Initial Tasks: [A, B, C]
        // User is focused on Index 0 (Task A)
        const taskA = { id: 'A.md', title: 'Task A', duration: 30, isAnchored: false, status: 'todo' as const, children: [] };
        const taskB = { id: 'B.md', title: 'Task B', duration: 30, isAnchored: false, status: 'todo' as const, children: [] };
        const taskC = { id: 'C.md', title: 'Task C', duration: 30, isAnchored: false, status: 'todo' as const, children: [] };

        view.tasks = [taskA, taskB, taskC];

        // 1. Initial State: Set explicit IDs manually to bypass setState issues in test env
        const testIds = ['A.md', 'B.md', 'C.md'];
        (view as any).currentTaskIds = testIds;

        // Also ensure tasks are set initially so we have a "current focus"
        view.tasks = [taskA, taskB, taskC]; // Initial order

        // Mock getFocusedIndex to return 0 (Task A)
        mocks.component.getFocusedIndex = vi.fn().mockReturnValue(0);

        // STRATEGY CHANGE: StackView doesn't know focus. The Component does.
        // We need StackView.reload() to ASK the component for current focus ID, OR pass it in.
        // But reload() has no args. 
        // So StackView needs `this.component.getFocusedIndex()` or similar.

        // Let's assume we add `getFocusedIndex()` to the Svelte component and mock it returning 0 (Task A).
        mocks.component.getFocusedIndex = vi.fn().mockReturnValue(0);

        // Mock the loader returning the NEW order: [B, A, C]
        mocks.loader.loadSpecificFiles.mockResolvedValue([taskB, taskA, taskC]);
        // Update NavManager to return this new stack
        mocks.navManager.getCurrentStack.mockReturnValue([taskB, taskA, taskC]);

        // Trigger Reload
        await view.reload();

        // Assertions:
        // 1. Should fetch current index (0)
        expect(mocks.component.getFocusedIndex).toHaveBeenCalled();

        // 2. Should calculate new index for Task A (which is now at Index 1)

        // 3. Should call setFocus(1)
        expect(mocks.component.setFocus).toHaveBeenCalledWith(1);
    });
});
