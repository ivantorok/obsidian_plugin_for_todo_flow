
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock Obsidian deps BEFORE imports
vi.mock('obsidian', () => {
    const mockAppInstance = {
        workspace: {
            on: vi.fn(),
            onLayoutReady: vi.fn((cb) => cb()),
            getLeavesOfType: vi.fn().mockReturnValue([]),
            getActiveViewOfType: vi.fn(),
            getLeaf: vi.fn()
        },
        setting: {
            open: vi.fn(),
            openTabById: vi.fn()
        },
        vault: {
            on: vi.fn(),
            getAbstractFileByPath: vi.fn(),
            adapter: { exists: vi.fn() },
            process: vi.fn().mockResolvedValue({}),
            create: vi.fn()
        }
    };

    class MockApp {
        workspace = mockAppInstance.workspace;
        setting = mockAppInstance.setting;
        vault = mockAppInstance.vault;
    }

    return {
        App: MockApp,
        Plugin: class {
            app: any;
            manifest = { version: '1.0.0' };
            constructor(app: any) { this.app = app; }
            addCommand = vi.fn();
            addSettingTab = vi.fn();
            registerView = vi.fn();
            registerEvent = vi.fn();
            loadData = vi.fn().mockResolvedValue({});
            saveData = vi.fn();
        },
        ItemView: class {
            constructor(public leaf: any) { }
            addAction = vi.fn();
            getViewType = vi.fn();
        },
        Modal: class { constructor(public app: any) { }; open() { }; close() { }; },
        PluginSettingTab: class { constructor(public app: any, public plugin: any) { } },
        Setting: class {
            constructor(public containerEl: HTMLElement) { }
            setName = vi.fn().mockReturnThis();
            setDesc = vi.fn().mockReturnThis();
            addText = vi.fn().mockReturnThis();
            addToggle = vi.fn().mockReturnThis();
            addDropdown = vi.fn().mockReturnThis();
            setValue = vi.fn().mockReturnThis();
            onChange = vi.fn().mockReturnThis();
            setPlaceholder = vi.fn().mockReturnThis();
        },
        WorkspaceLeaf: class { },
        TFile: class { },
        TFolder: class { },
        FuzzySuggestModal: class {
            constructor(public app: any) { }
            setPlaceholder = vi.fn();
            open = vi.fn();
            close = vi.fn();
        },
        Notice: class {
            constructor(public message: string) { }
        }
    };
});

// Mock other dependencies
vi.mock('../logger.js', () => ({
    FileLogger: class {
        info = vi.fn();
        warn = vi.fn();
        error = vi.fn();
        setEnabled = vi.fn();
    }
}));

vi.mock('../ViewManager.js', () => ({
    ViewManager: class {
        handleActiveLeafChange = vi.fn();
    }
}));

import TodoFlowPlugin from '../main.js';
import { App } from 'obsidian';

describe('TodoFlowPlugin Command Registration', () => {
    let plugin: TodoFlowPlugin;
    let mockApp: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApp = new App();
        plugin = new TodoFlowPlugin(mockApp, { id: 'todo-flow', name: 'Todo Flow' } as any);
    });

    it('should register "open-settings" command on load', async () => {
        await plugin.onload();

        expect(plugin.addCommand).toHaveBeenCalledWith(expect.objectContaining({
            id: 'open-settings',
            name: 'Open Settings'
        }));
    });

    it('should open settings tab when "open-settings" command is executed', async () => {
        await plugin.onload();

        // Find the command registration call
        const addCommandCall = (plugin.addCommand as any).mock.calls.find(
            (call: any) => call[0].id === 'open-settings'
        );

        expect(addCommandCall).toBeDefined();
        const callback = addCommandCall[0].callback;

        // Execute the callback
        callback();

        // Verify Obsidian API calls
        expect(mockApp.setting.open).toHaveBeenCalled();
        expect(mockApp.setting.openTabById).toHaveBeenCalledWith('todo-flow');
    });
});
