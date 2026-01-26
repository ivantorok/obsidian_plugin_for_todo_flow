import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StackView } from '../views/StackView.js';
import { NavigationManager } from '../navigation/NavigationManager.js';
import { StackLoader } from '../loaders/StackLoader.js';
import { mount, unmount } from 'svelte';

// Mock Obsidian
vi.mock('obsidian', () => {
    return {
        ItemView: class {
            leaf: any;
            contentEl: HTMLElement;
            constructor(leaf: any) {
                this.leaf = leaf;
                this.contentEl = document.createElement('div');
            }
            getViewType() { return 'test'; }
            getDisplayText() { return 'test'; }
            async setState(state: any, result: any) { }
        },
        WorkspaceLeaf: class { },
        TFile: class { },
        TFolder: class { },
        Notice: class { },
        Plugin: class { },
        Modal: class {
            contentEl: HTMLElement;
            constructor(app: any) {
                this.contentEl = document.createElement('div');
            }
            open() { }
            close() { }
        },
        Setting: class {
            constructor(containerEl: HTMLElement) { }
            setName(name: string) { return this; }
            setDesc(desc: string) { return this; }
            addText(cb: any) { return this; }
            addButton(cb: any) { return this; }
        },
        PluginSettingTab: class {
            constructor(app: any, plugin: any) { }
            display() { }
        }
    };
});

// Mock Svelte mount/unmount
vi.mock('svelte', () => ({
    mount: vi.fn().mockReturnValue({ $set: vi.fn(), setTasks: vi.fn(), setFocus: vi.fn() }),
    unmount: vi.fn()
}));

// Mock StackLoader
vi.mock('../loaders/StackLoader.js', () => {
    return {
        StackLoader: class {
            load = vi.fn().mockResolvedValue([]);
            parser = {
                resolveTaskMetadata: vi.fn().mockResolvedValue({
                    title: 'Mock Title',
                    duration: 30,
                    status: 'todo',
                    isAnchored: false
                })
            };
        }
    };
});

describe('StackView Integration', () => {
    let mockApp: any;
    let mockLeaf: any;
    let mockLogger: any;
    let mockHistoryManager: any;
    let stackView: StackView;

    beforeEach(() => {
        vi.clearAllMocks();

        mockApp = {
            vault: {
                getAbstractFileByPath: vi.fn(),
                process: vi.fn()
            },
            workspace: {
                getActiveViewOfType: vi.fn(),
                openLinkText: vi.fn()
            }
        };

        mockLeaf = {
            setViewState: vi.fn()
        };

        mockLogger = {
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn()
        };

        mockHistoryManager = {
            executeCommand: vi.fn(),
            undo: vi.fn(),
            redo: vi.fn()
        };

        stackView = new StackView(
            mockLeaf,
            { debug: false } as any,
            mockHistoryManager,
            mockLogger,
            vi.fn(),
            vi.fn()
        );
        // @ts-ignore
        stackView.app = mockApp;
    });

    it('should initialize NavigationManager and StackLoader in constructor', () => {
        expect(stackView.navManager).toBeDefined();
        expect(stackView.loader).toBeDefined();
        expect(stackView.navManager).toBeInstanceOf(NavigationManager);
        expect(stackView.loader).toBeInstanceOf(StackLoader);
    });

    it('should handle setState for a file by calling StackLoader and setting stack', async () => {
        const mockTasks = [{ id: 'task1', title: 'Task 1', duration: 30, status: 'todo', isAnchored: false, children: [] } as any];
        // @ts-ignore
        stackView.loader.load.mockResolvedValue(mockTasks);

        await stackView.setState({ rootPath: 'test.md' }, {});

        expect(stackView.rootPath).toBe('test.md');
        // @ts-ignore
        expect(stackView.loader.load).toHaveBeenCalledWith('test.md');
        const stack = stackView.navManager.getCurrentStack();
        expect(stack[0]!.id).toBe('task1');
        expect(stack[0]!.duration).toBe(30);
    });
});
