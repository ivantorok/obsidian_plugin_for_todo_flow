
// Mock Obsidian deps BEFORE imports
vi.mock('obsidian', () => ({
    ItemView: class {
        contentEl: HTMLElement;
        containerEl: HTMLElement;
        constructor(public leaf: any) {
            this.contentEl = document.createElement('div');
            this.containerEl = document.createElement('div');
        }
        registerEvent() { }
    },
    Modal: class { constructor(public app: any) { }; open() { }; close() { }; },
    Plugin: class { },
    PluginSettingTab: class { },
    Setting: class { },
    WorkspaceLeaf: class { },
    App: class { },
    TFile: class { }
}));

// Mock Views
vi.mock('../views/StackView.js', () => ({
    StackView: class { },
    VIEW_TYPE_STACK: 'todo-flow-stack-view'
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ViewManager } from '../ViewManager.js';

// Mock dependencies
const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
};

describe('ViewManager', () => {
    let manager: ViewManager;
    let mockApp: any;
    let mockWorkspace: any;

    beforeEach(() => {
        mockWorkspace = {
            getActiveViewOfType: vi.fn(),
            on: vi.fn() // For registering events
        };
        mockApp = {
            workspace: mockWorkspace
        };
        manager = new ViewManager(mockApp, mockLogger as any);
    });

    it('should be instantiated', () => {
        expect(manager).toBeDefined();
    });

    it('should trigger reload on the active view when leaf changes', async () => {
        // Setup a mock view with a reload method
        const mockView = {
            getViewType: () => 'todo-flow-stack-view',
            reload: vi.fn().mockResolvedValue(undefined)
        };

        // When getActiveViewOfType is called with any type, return our mock view
        mockWorkspace.getActiveViewOfType.mockReturnValue(mockView);

        // Simulate the event trigger manually to test the handler logic
        // (In reality, we'd need to expose the handler or spy on the registration)

        // Let's assume we expose a public method `handleActiveLeafChange` for testability
        await manager.handleActiveLeafChange();

        expect(mockView.reload).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Active leaf changed'));
    });

    it('should NOT trigger reload if active view is not a StackView', async () => {
        // Return null (not a stack view)
        mockWorkspace.getActiveViewOfType.mockReturnValue(null);

        await manager.handleActiveLeafChange();

        expect(mockLogger.info).not.toHaveBeenCalledWith(expect.stringContaining('Reloading'));
    });
});
