import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StackView } from '../views/StackView';

// Mock Obsidian modules
vi.mock('obsidian', () => ({
    ItemView: class {
        app: any;
        leaf: any;
        containerEl = { focus: vi.fn(), tabIndex: 0 };
        contentEl = { focus: vi.fn(), createEl: vi.fn() };
        constructor(leaf: any) {
            this.leaf = leaf;
            this.app = leaf.app;
        }
        registerEvent() { }
        registerInterval() { }
    },
    TFile: class { },
    Notice: vi.fn(),
    mount: vi.fn(),
    unmount: vi.fn()
}));

// Mock everything StackView imports to avoid transitive resolution errors
vi.mock('../history.js', () => ({ HistoryManager: class { } }));
vi.mock('../logger.js', () => ({ FileLogger: class { info() { } warn() { } error() { } } }));
vi.mock('../loaders/StackLoader.js', () => ({ StackLoader: class { parser = { resolveTaskMetadata: vi.fn() } } }));
vi.mock('../navigation/NavigationManager.js', () => ({
    NavigationManager: class {
        onStackChange() { }
        getState() { return { history: [], currentSource: '' } }
        getCurrentStack() { return [] }
        destroy() { }
    }
}));
vi.mock('../services/StackPersistenceService.js', () => ({
    StackPersistenceService: class {
        isExternalUpdate() { return Promise.resolve(false) }
        claimLock() { }
        releaseLock() { }
        saveStack() { return Promise.resolve() }
    }
}));
vi.mock('../ui/QuickAddModal.js', () => ({ QuickAddModal: class { } }));
vi.mock('../ui/DurationPickerModal.js', () => ({ DurationPickerModal: class { } }));
vi.mock('../services/ExportService.js', () => ({ ExportService: class { } }));
vi.mock('../ViewManager.js', () => ({ ViewManager: class { isSovereign() { return true } } }));

describe('BUG-021: Deferred Reload', () => {
    let mockApp: any;
    let mockSettings: any;
    let stackView: any;
    let mockLeaf: any;

    beforeEach(() => {
        mockApp = {
            metadataCache: { on: vi.fn() },
            workspace: { requestSaveLayout: vi.fn() },
            vault: { on: vi.fn() },
            internalPlugins: { getPluginById: () => ({ instance: { status: 'idle' } }) }
        };
        mockLeaf = { app: mockApp };
        mockSettings = { targetFolder: '/tasks', debug: true };

        stackView = new (StackView as any)(
            mockLeaf,
            mockSettings,
            {}, // history
            { info: vi.fn(), warn: vi.fn(), error: vi.fn() }, // logger
            { isSovereign: () => true }, // viewManager
            { isExternalUpdate: vi.fn(), claimLock: vi.fn(), releaseLock: vi.fn() }, // persistence
            vi.fn(), // onUpdate
            vi.fn()  // onCreate
        );

        // Mock NavManager methods that real reload calls
        stackView.navManager = { refresh: vi.fn(), destroy: vi.fn() };
        stackView.flushPersistence = vi.fn().mockResolvedValue(undefined);
        stackView.governor = { claimInteraction: vi.fn(), releaseInteraction: vi.fn() };
    });

    it('should defer reload when persistence is locked', async () => {
        stackView.lockPersistence('/path', 'token-1');

        await stackView.reload();

        expect(stackView.isReloadPending).toBe(true);
        expect(stackView.navManager.refresh).not.toHaveBeenCalled();

        stackView.unlockPersistence('/path', 'token-1');

        // Let the async reload() call inside unlockPersistence start
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(stackView.isReloadPending).toBe(false);
        expect(stackView.navManager.refresh).toHaveBeenCalled();
    });

    it('should execute reload immediately if not locked', async () => {
        await stackView.reload();

        expect(stackView.isReloadPending).toBe(false);
        expect(stackView.navManager.refresh).toHaveBeenCalled();
    });
});
