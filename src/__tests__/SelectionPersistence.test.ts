
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock Obsidian modules
vi.mock('obsidian', () => {
    return {
        App: class { },
        WorkspaceLeaf: class { },
        Modal: class {
            constructor() { }
            open() { }
            close() { }
            contentEl = { createEl: () => ({ createEl: () => { } }) };
        },
        FuzzySuggestModal: class {
            constructor() { }
            open() { }
            close() { }
            setPlaceholder() { }
            scope = { register: () => { }, unregister: () => { } };
        },
        Scope: class {
            register() { }
            unregister() { }
        },
        Notice: class { },
        ItemView: class {
            leaf: any;
            app: any;
            contentEl: HTMLElement;
            containerEl: HTMLElement;
            constructor(leaf: any) {
                this.leaf = leaf;
                this.app = leaf.app;
                this.contentEl = document.createElement('div');
                this.containerEl = document.createElement('div');
            }
            addAction() { }
            setState() { return Promise.resolve(); }
        },
        TFile: class { },
        TFolder: class { },
        Plugin: class {
            loadData() { return Promise.resolve({}); }
            saveData() { }
            addCommand() { }
            addSettingTab() { }
            registerView() { }
            app = { workspace: { on: () => { }, getActiveViewOfType: () => null } };
        },
        PluginSettingTab: class {
            constructor() { }
            display() { }
        },
        Setting: class {
            constructor() { }
            setName() { return this; }
            setDesc() { return this; }
            addText() { return this; }
            addToggle() { return this; }
            onChange() { return this; }
        }
    };
});

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
        setState: vi.fn(),
        setFocus: vi.fn(),
        onStackChange: vi.fn().mockReturnValue(() => { }),
        destroy: vi.fn(),
        refresh: vi.fn().mockResolvedValue(undefined)
    },
    component: {
        setTasks: vi.fn(),
        setNavState: vi.fn(),
        setFocus: vi.fn(),
        getFocusedIndex: vi.fn(),
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
        const mockApp = {
            metadataCache: { on: vi.fn(), offref: vi.fn() },
            workspace: { getLeavesOfType: vi.fn(() => []), on: vi.fn() },
            vault: { getAbstractFileByPath: vi.fn(), adapter: { exists: vi.fn().mockResolvedValue(true) } }
        } as any;
        mockLeaf = {
            app: mockApp,
            setViewState: vi.fn(),
            on: vi.fn()
        };
        mockSettings = { timingMode: 'now', keys: { debug: false } };
        mockHistory = {};
        mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

        vi.clearAllMocks();

        const mockPersistence = {
            saveStack: vi.fn(),
            loadStackIds: vi.fn(),
            isExternalUpdate: vi.fn().mockReturnValue(true)
        };
        view = new StackView(mockLeaf as any, mockSettings, mockHistory as any, mockLogger as any, { isSovereign: vi.fn().mockReturnValue(true) } as any, mockPersistence as any, vi.fn(), vi.fn());

        // Manual component mount mock since we can't fully mock Svelte lifecycle easily here
        view.component = mocks.component;
    });

    it('should restore focus to the same task ID even if its index changes', async () => {
        // Initial State: Task A at index 0
        const taskA = { id: 'A.md', title: 'Task A', duration: 30, isAnchored: false, status: 'todo' as const, children: [] };
        const taskB = { id: 'B.md', title: 'Task B', duration: 30, isAnchored: false, status: 'todo' as const, children: [] };
        const taskC = { id: 'C.md', title: 'Task C', duration: 30, isAnchored: false, status: 'todo' as const, children: [] };

        const initialTasks = [taskA, taskB, taskC];
        view.navManager.setStack(initialTasks, 'EXPLICIT:3');
        view.navManager.setFocus(0); // Focused on Task A

        // Mock the loader returning the NEW order: [B, A, C]
        const freshData = [taskB, taskA, taskC];
        mocks.loader.loadSpecificFiles.mockResolvedValue(freshData);
        mocks.loader.load.mockResolvedValue(freshData);
        // Note: Real NavManager will re-calculate focus index during refresh()

        // Trigger Reload (which calls navManager.refresh())
        await view.reload();

        // Assertions:
        // 1. NavigationManager should have updated its focused index to 1 (where Task A is now)
        expect(view.navManager.getState().currentFocusedIndex).toBe(1);

        // 2. Component should have been notified via setNavState (Unified State)
        expect(mocks.component.setNavState).toHaveBeenCalled();
        const calls = mocks.component.setNavState.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const calledState = calls[calls.length - 1][0];
        expect(calledState?.focusedIndex).toBe(1);
    });
});
