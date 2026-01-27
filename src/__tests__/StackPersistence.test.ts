import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StackView } from '../views/StackView.js';
import { NavigationManager } from '../navigation/NavigationManager.js';
import { StackLoader } from '../loaders/StackLoader.js';
import { FileLogger } from '../logger.js';
import { HistoryManager } from '../history.js';
import { WorkspaceLeaf, App } from 'obsidian';
import { type TodoFlowSettings } from '../main.js';
import moment from 'moment';
import { type TaskNode } from '../scheduler.js';

// Mocks
vi.mock('../navigation/NavigationManager');
vi.mock('../loaders/StackLoader');
vi.mock('../logger');
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
        Notice: class { },
        ItemView: class {
            constructor() { }
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
            app = { workspace: { on: () => { } } };
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
vi.mock('svelte', () => ({
    mount: vi.fn(),
    unmount: vi.fn()
}));

describe('Stack Persistence', () => {
    let stackView: StackView;
    let mockLeaf: WorkspaceLeaf;
    let mockSettings: TodoFlowSettings;
    let mockHistoryManager: HistoryManager;
    let mockLogger: FileLogger;
    let mockLoader: StackLoader;
    let mockNavManager: NavigationManager;
    let mockApp: App;

    beforeEach(() => {
        mockApp = {
            vault: {
                getAbstractFileByPath: vi.fn(),
                adapter: { exists: vi.fn() }
            },
            workspace: {
                getLeaf: vi.fn(),
                getActiveViewOfType: vi.fn()
            }
        } as unknown as App;

        mockLeaf = {
            view: null,
            detach: vi.fn()
        } as unknown as WorkspaceLeaf;

        mockSettings = {
            timingMode: 'now',
            keys: { debug: false }
        } as unknown as TodoFlowSettings;

        mockHistoryManager = {} as HistoryManager;
        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn()
        } as unknown as FileLogger;

        // Reset mocks
        // Reset mocks
        vi.clearAllMocks();

        // Instantiate StackView
        stackView = new StackView(
            mockLeaf,
            mockSettings,
            mockHistoryManager,
            mockLogger,
            vi.fn(), // onTaskUpdate
            vi.fn()  // onTaskCreate
        );

        // Inject mocks into private/protected properties if necessary,
        // or ensure constructor set them up effectively.
        // We mocked NavigationManager class, so stackView.navManager is a mock instance.
        mockNavManager = stackView.navManager;
        mockLoader = stackView.loader;

        // Mock the parser specifically for logStackDetails
        (mockLoader as any).parser = {
            resolveTaskMetadata: vi.fn().mockResolvedValue({})
        };

        // Setup default mock returns
        (mockNavManager.getState as any).mockReturnValue({
            history: [],
            currentSource: 'root'
        });
        (mockNavManager.getCurrentStack as any).mockReturnValue([]);
    });

    describe('getState', () => {
        it('should include full NavigationManager state', () => {
            const expectedNavState = {
                history: [[{ id: 'task1' }]],
                currentSource: 'task1',
                currentFocusedIndex: 5
            };

            // Setup
            stackView.rootPath = 'root';
            (mockNavManager.getState as any).mockReturnValue(expectedNavState);

            // Act
            const state = stackView.getState();

            // Assert
            expect(state).toHaveProperty('rootPath', 'root');
            expect(state).toHaveProperty('navState', expectedNavState);
        });
    });

    describe('setState', () => {
        it('should restore from navState if present (Deep Persistence)', async () => {
            const persistedState = {
                rootPath: 'root',
                navState: {
                    history: [[{ id: 'task1' } as TaskNode]],
                    currentSource: 'child-context',
                    currentFocusedIndex: 2
                }
            };

            const mockTasks = [{ id: 'child-task-1' } as TaskNode];
            (mockNavManager.getCurrentStack as any).mockReturnValue(mockTasks);

            // Act
            await stackView.setState(persistedState, null);

            // Assert
            expect(mockNavManager.setState).toHaveBeenCalledWith(persistedState.navState);
            expect(stackView.tasks).toEqual(mockTasks);
            // Verify we didn't trigger a standard load
            expect(mockLoader.load).not.toHaveBeenCalled();
        });

        it('should fallback to standard load if no navState history', async () => {
            const standardState = {
                rootPath: 'some/folder'
            };

            (mockLoader.load as any).mockResolvedValue([{ id: 'task1' }]);

            // Act
            await stackView.setState(standardState, null);

            // Assert
            expect(mockLoader.load).toHaveBeenCalledWith('some/folder');
            expect(mockNavManager.setState).not.toHaveBeenCalled();
            expect(mockNavManager.setStack).toHaveBeenCalled(); // Standard initialization
        });
    });

    describe('reload', () => {
        it('should capture full state (including navState) before re-calling setState', async () => {
            // Setup current state
            stackView.rootPath = 'root';
            const currentNavState = {
                history: [[{ id: 'p1' }]],
                currentSource: 'p1'
            };
            (mockNavManager.getState as any).mockReturnValue(currentNavState);

            // Spy on setState
            const setStateSpy = vi.spyOn(stackView, 'setState');
            // Prevent setState from doing real work during this test if desired, 
            // but for integration logic we might want it to flow. 
            // Here we just want to verify what it was called WITH.
            setStateSpy.mockResolvedValue();

            // Act
            await stackView.reload();

            // Assert
            // The critical fix was: const state = this.getState();
            // So reload should call setState with an object containing navState
            expect(setStateSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    rootPath: 'root',
                    navState: currentNavState
                }),
                null
            );
        });
    });
});
