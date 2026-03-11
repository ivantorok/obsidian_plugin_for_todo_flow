import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StackView } from '../views/StackView.js';
import { type TaskNode } from '../scheduler.js';
import { InteractionIdleQueue } from '../services/InteractionIdleQueue.js';

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
    executeCommand: vi.fn().mockImplementation(async (cmd) => {
        if (cmd && typeof cmd.execute === 'function') {
            await cmd.execute();
        }
    })
};

const mockLogger = { info: (msg: string) => console.log(`[LOGGER] ${msg}`), error: (msg: string) => console.error(`[LOGGER] ${msg}`) };
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
        InteractionIdleQueue.resetInstance();
        vi.clearAllMocks();
        onTaskCreateSpy = vi.fn();
        stackView = new StackView(
            mockLeaf as any,
            mockSettings as any,
            mockHistoryManager as any,
            mockLogger as any,
            { isSovereign: vi.fn().mockReturnValue(true) } as any, // mockViewManager
            { ...mockPersistenceService, onIdleChange: vi.fn(), getIsIdle: vi.fn().mockReturnValue(true) } as any,
            vi.fn(), // onTaskUpdate
            onTaskCreateSpy // onTaskCreate
        );
        // @ts-ignore
        stackView.app = mockApp;
        stackView.rootPath = 'todo-flow';

        const tasks: TaskNode[] = [];
        // CRITICAL: We MUST have a component mocked BEFORE we do anything
        stackView.component = {
            resolveTempId: vi.fn(),
            getController: vi.fn().mockReturnValue({
                addTaskAt: vi.fn().mockImplementation((index, node) => {
                    tasks.splice(index, 0, node);
                    return { resultIndex: index };
                }),
                getTasks: vi.fn().mockImplementation(() => tasks),
                insertAfter: vi.fn().mockImplementation((index, node) => {
                    tasks.splice(index + 1, 0, node);
                    return index + 1;
                })
            }),
            update: vi.fn(),
            setFocus: vi.fn(),
            setIsSyncing: vi.fn(),
            setIsPersistenceIdle: vi.fn()
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
        const actionPromise = capturedCallback({ type: 'new', title: 'Async Task' });

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

        // Await the synchronous part of handleQuickAddResult to catch any exceptions
        await actionPromise;

        // Wait for the temp ID resolution to happen
        // We use a simple loop instead of flushPersistence to avoid any potential deadlock
        // with the background tracker in the test environment.
        let resolved = false;
        for (let i = 0; i < 500; i++) {
            if (stackView.component.resolveTempId.mock.calls.length > 0) {
                resolved = true;
                break;
            }
            await new Promise(r => setTimeout(r, 10));
        }

        // Verify the component was notified
        expect(resolved).toBe(true);
        expect(stackView.component.resolveTempId).toHaveBeenCalledWith(expect.stringContaining('temp-'), newNode.id);
    }, 10000); // 10 second timeout for CI
});
