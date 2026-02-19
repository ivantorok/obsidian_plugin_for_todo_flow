import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onMount, mount } from 'svelte';
import { StackView } from '../views/StackView.js';
import { WorkspaceLeaf, App, View } from 'obsidian';
import moment from 'moment';

// Mock Obsidian
vi.mock('obsidian', () => ({
    Plugin: class {
        addCommand = vi.fn();
        addSettingTab = vi.fn();
        registerView = vi.fn();
        registerEvent = vi.fn();
        registerInterval = vi.fn();
        loadData = vi.fn().mockResolvedValue({});
        saveData = vi.fn();
        app = {
            workspace: {
                on: vi.fn(),
                getLeavesOfType: vi.fn(),
                requestSaveLayout: vi.fn()
            },
            vault: { getAbstractFileByPath: vi.fn(), adapter: { exists: vi.fn().mockResolvedValue(true) } },
            metadataCache: { on: vi.fn(), offref: vi.fn() }
        };
    },
    ItemView: class {
        leaf: any;
        app: any;
        contentEl: HTMLElement;
        containerEl: HTMLElement;
        constructor(leaf: any) {
            this.leaf = leaf;
            this.app = leaf.app; // Use leaf.app
            this.contentEl = document.createElement('div');
            this.containerEl = document.createElement('div');
        }
        registerDomEvent = vi.fn();
        registerEvent = vi.fn();
        registerInterval = vi.fn();
    },
    WorkspaceLeaf: class {
        view: any;
        constructor() { this.view = {}; }
        setViewState = vi.fn();
        on = vi.fn();
    },
    Notice: class { },
    TFile: class { },
    FuzzySuggestModal: class { },
    PluginSettingTab: class { },
    Setting: class {
        setName() { return this; }
        setDesc() { return this; }
        addText() { return this; }
        addToggle() { return this; }
    }
}));

// Mock Svelte mount
vi.mock('svelte', () => ({
    mount: vi.fn().mockReturnValue({}),
    unmount: vi.fn(),
    onMount: vi.fn(),
    createEventDispatcher: vi.fn(),
    untrack: vi.fn(fn => fn())
}));

describe('StackView Persistence Optimization', () => {
    let leaf: any;
    let mockPersistence: any;
    let stackView: any;
    let svelteProps: any;

    beforeEach(() => {
        vi.useFakeTimers();
        leaf = new WorkspaceLeaf();
        leaf.app = {
            workspace: {
                on: vi.fn(),
                getLeavesOfType: vi.fn(() => []),
                requestSaveLayout: vi.fn()
            },
            vault: { getAbstractFileByPath: vi.fn(), adapter: { exists: vi.fn().mockResolvedValue(true) } },
            metadataCache: { on: vi.fn(), offref: vi.fn() }
        };
        mockPersistence = {
            saveStack: vi.fn().mockResolvedValue(undefined),
            isExternalUpdate: vi.fn().mockReturnValue(true)
        };

        (mount as any).mockClear();

        stackView = new StackView(
            leaf,
            { keys: {} } as any,
            {} as any,
            { info: vi.fn() } as any,
            { isSovereign: vi.fn().mockReturnValue(true) } as any, // mockViewManager
            mockPersistence,
            vi.fn(),
            vi.fn()
        );

        stackView.rootPath = 'CurrentStack.md';
        stackView.onOpen();

        // Capture props passed to mount
        const calls = (mount as any).mock.calls;
        if (calls.length > 0) {
            svelteProps = calls[0][1].props;
        }
    });

    it('should debounce saves to CurrentStack.md', async () => {
        const tasks = [{ id: 'task1.md', status: 'todo' }] as any;

        // Trigger multiple stack changes
        svelteProps.onStackChange(tasks);
        svelteProps.onStackChange(tasks);
        svelteProps.onStackChange(tasks);

        // No save should have happened yet
        expect(mockPersistence.saveStack).not.toHaveBeenCalled();

        // Advance time by 400ms (less than 500ms debounce)
        vi.advanceTimersByTime(400);
        expect(mockPersistence.saveStack).not.toHaveBeenCalled();

        // Advance to 500ms
        vi.advanceTimersByTime(100);
        expect(mockPersistence.saveStack).toHaveBeenCalledTimes(1);
    });

    it('should skip saving if IDs and status haven\'t changed', async () => {
        const tasks = [{ id: 'task1.md', status: 'todo' }] as any;

        // First save
        svelteProps.onStackChange(tasks);
        vi.advanceTimersByTime(500);
        await Promise.resolve();
        await Promise.resolve();
        expect(mockPersistence.saveStack).toHaveBeenCalledTimes(1);

        // Second change with SAME tasks (e.g. metadata update like duration only)
        // Note: Our selective sync currently checks ID + Status
        svelteProps.onStackChange(tasks);
        vi.advanceTimersByTime(500);
        await Promise.resolve();

        // Should NOT have called save again
        expect(mockPersistence.saveStack).toHaveBeenCalledTimes(1);
    });

    it('should save if status changes', async () => {
        const tasks1 = [{ id: 'task1.md', status: 'todo' }] as any;
        const tasks2 = [{ id: 'task1.md', status: 'done' }] as any;

        svelteProps.onStackChange(tasks1);
        vi.advanceTimersByTime(500);
        await Promise.resolve();
        await Promise.resolve();
        expect(mockPersistence.saveStack).toHaveBeenCalledTimes(1);

        svelteProps.onStackChange(tasks2);
        vi.advanceTimersByTime(500);
        await Promise.resolve();
        await Promise.resolve();
        expect(mockPersistence.saveStack).toHaveBeenCalledTimes(2);
    });
});
