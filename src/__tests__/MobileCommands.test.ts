import { describe, it, expect, vi, beforeEach } from 'vitest';
import TodoFlowPlugin from '../main.js';
import { QuickAddModal } from '../ui/QuickAddModal.js';

// Mock dependencies
vi.mock('obsidian', () => ({
    Plugin: class {
        addCommand = vi.fn();
        addSettingTab = vi.fn();
        registerView = vi.fn();
        registerEvent = vi.fn(); // Added mock
        loadData = vi.fn().mockResolvedValue({});
        saveData = vi.fn();
        app = {
            workspace: { onLayoutReady: vi.fn(), on: vi.fn(), getLeavesOfType: vi.fn(), getLeaf: vi.fn() },
            vault: { getAbstractFileByPath: vi.fn(), on: vi.fn() },
            metadataCache: { on: vi.fn(), getFileCache: vi.fn() }
        };
    },
    ItemView: class { },
    WorkspaceLeaf: class { },
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

vi.mock('../ui/QuickAddModal.js', () => ({
    QuickAddModal: class {
        constructor(app: any, onChoose: any) { }
        open = vi.fn();
        setPlaceholder = vi.fn();
    }
}));

// Mock other modules to avoid errors during plugin instantiation
vi.mock('../history.js', () => ({ HistoryManager: class { } }));
vi.mock('../logger.js', () => ({ FileLogger: class { info = vi.fn(); } }));
vi.mock('../services/ViewManager.js', () => ({ ViewManager: class { } }));
vi.mock('../services/StackPersistenceService.js', () => ({ StackPersistenceService: class { } }));

describe('Add Task Command', () => {
    let plugin: TodoFlowPlugin;

    beforeEach(async () => {
        plugin = new TodoFlowPlugin({} as any, {} as any);
        // @ts-ignore
        plugin.manifest = { version: '1.0.0' };
        await plugin.onload();
    });

    it('should register "Add Task to Stack" command', () => {
        const addCommandSpy = plugin.addCommand as unknown as ReturnType<typeof vi.fn>;

        // Check that the command was registered with the correct id and name
        const calls = addCommandSpy.mock.calls;
        const addTaskCommand = calls.find(call =>
            call[0]?.id === 'add-task-to-stack' && call[0]?.name === 'Add Task to Stack'
        );

        expect(addTaskCommand).toBeDefined();
        expect(addTaskCommand![0]).toHaveProperty('callback');
    });

    // We can't easily test the callback execution without exposing internal methods or more complex mocking,
    // but verifying registration is the key step effectively. 
});
