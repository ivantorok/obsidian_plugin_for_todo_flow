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

const mockHistoryManager = {
    executeCommand: vi.fn().mockResolvedValue(undefined)
};

const mockLogger = { info: vi.fn(), error: vi.fn() };

const mockPersistenceService = {
    saveStack: vi.fn(),
    flushPersistence: vi.fn()
};

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
        registerEvent() { }
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
        vi.clearAllMocks();
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

        // CRITICAL: We MUST have a component mocked BEFORE we do anything
        stackView.component = {
            resolveTempId: vi.fn(),
            getController: vi.fn().mockReturnValue({
                addTaskAt: vi.fn().mockReturnValue({ resultIndex: 0 }),
                getTasks: vi.fn().mockReturnValue([]),
                insertAfter: vi.fn().mockReturnValue(0)
            }),
            update: vi.fn(),
            setFocus: vi.fn()
        };
    });

    it('should await onTaskCreate before updating the stack', async () => {
        // Arrange
        let resolveCreation: (node: TaskNode) => void;
        const creationPromise = new Promise<TaskNode>((resolve) => {
            resolveCreation = resolve!;
        });

        onTaskCreateSpy.mockReturnValue(creationPromise);

        // Act: Open modal
        stackView.openAddModal();

        expect(capturedCallback).toBeDefined();

        // Simulate user choosing to create a new task
        const callbackPromise = capturedCallback({ type: 'new', title: 'Async Task' });

        // Resolve the creation
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

        // Await the callback loop and background resolution
        await callbackPromise;

        // Wait for microtasks to ensure tracker is updated
        await new Promise(r => setTimeout(r, 0));

        // @ts-ignore
        await Promise.all(Array.from(stackView.pendingSyncs));

        // Verify the component was notified
        expect(stackView.component.resolveTempId).toHaveBeenCalledWith(expect.stringContaining('temp-'), newNode.id);
        expect(mockPersistenceService.saveStack).toHaveBeenCalled();
    });
});
