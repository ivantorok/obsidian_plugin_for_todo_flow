import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StackView } from '../views/StackView.js';
import { type TaskNode } from '../scheduler.js';

// Mock dependencies
const mockApp = {
    vault: {
        getAbstractFileByPath: vi.fn(),
        create: vi.fn(),
        adapter: { exists: vi.fn().mockResolvedValue(true) }
    },
    workspace: {
        requestSaveLayout: vi.fn(),
        getLeavesOfType: vi.fn().mockReturnValue([]),
        getLeaf: vi.fn().mockReturnValue({ view: {} }),
    },
    metadataCache: {
        on: vi.fn(),
        offref: vi.fn()
    }
};

const mockLeaf = {
    app: mockApp,
    view: null,
};

const mockSettings = {
    targetFolder: 'todo-flow',
    keys: { debug: false }
};

const mockHistoryManager = {};
const mockLogger = { info: vi.fn(), error: vi.fn() };
const mockPersistenceService = { saveStack: vi.fn() };

// Mock QuickAddModal to capture the callback
let capturedCallback: (result: any) => Promise<void>;
vi.mock('../ui/QuickAddModal.js', () => ({
    QuickAddModal: class {
        onClose: any;
        constructor(app: any, onChoose: (result: any) => Promise<void>) {
            capturedCallback = onChoose;
            this.onClose = () => { };
        }
        open() { }
    }
}));

// Mock Svelte to avoid mounting issues
vi.mock('svelte', () => ({
    mount: vi.fn(),
    unmount: vi.fn()
}));

// Mock Obsidian
vi.mock('obsidian', () => ({
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
    },
    WorkspaceLeaf: class { },
    Notice: class { },
    Plugin: class { },
    PluginSettingTab: class { },
    Setting: class {
        setName() { return this; }
        setDesc() { return this; }
        addText() { return this; }
        addDropdown() { return this; }
    },
    FuzzySuggestModal: class {
        constructor(app: any) { }
        open() { }
        close() { }
        setPlaceholder() { }
        getItems() { return []; }
        getItemText() { return ''; }
        onChooseItem() { }
    },
    Modal: class {
        constructor(app: any) { }
        open() { }
        close() { }
    },
    Scope: class {
        register() { }
        unregister() { }
    }
}));

describe('Async File Creation in StackView', () => {
    let stackView: StackView;
    let onTaskCreateSpy: any;

    beforeEach(() => {
        onTaskCreateSpy = vi.fn();
        stackView = new StackView(
            mockLeaf as any,
            mockSettings as any,
            mockHistoryManager as any,
            mockLogger as any,
            { isSovereign: vi.fn().mockReturnValue(true) } as any, // mockViewManager
            mockPersistenceService as any,
            vi.fn(), // onTaskUpdate
            onTaskCreateSpy // onTaskCreate
        );
        // @ts-ignore
        stackView.app = mockApp;
        stackView.rootPath = 'CurrentStack.md';
    });

    it('should await onTaskCreate before updating the stack', async () => {
        // Arrange
        let resolveCreation: (node: TaskNode) => void;
        const creationPromise = new Promise<TaskNode>((resolve) => {
            resolveCreation = resolve;
        });

        onTaskCreateSpy.mockReturnValue(creationPromise);

        // Act: Open modal and trigger callback
        stackView.openAddModal();

        expect(capturedCallback).toBeDefined();

        // Simulate user choosing to create a new task
        const promise = capturedCallback({ type: 'new', title: 'Async Task' });

        // Assert: Stack should verify it hasn't updated yet (if we could check internal state easily, 
        // but tasks is public so we can)
        expect(stackView.tasks).toHaveLength(0);

        // Act: Resolve the creation
        const newNode: TaskNode = {
            id: 'path/to/Async Task.md',
            title: 'Async Task',
            duration: 30,
            status: 'todo',
            isAnchored: false,
            children: []
        };
        // @ts-ignore
        resolveCreation(newNode);

        // Await the callback to finish
        await promise;

        // Assert: Stack should now have the task
        expect(stackView.tasks).toHaveLength(1);
        expect(stackView.tasks[0]).toEqual(newNode);
        expect(mockPersistenceService.saveStack).toHaveBeenCalled();
    });
});
