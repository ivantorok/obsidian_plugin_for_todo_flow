
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock Obsidian modules (must be before imports)
vi.mock('obsidian', () => ({
    ItemView: class {
        constructor(public leaf: any) { }
        async setState(state: any, result: any) { }
    },
    WorkspaceLeaf: class { },
    TFile: class { },
    FuzzySuggestModal: class { constructor(public app: any) { }; setPlaceholder() { }; open() { }; close() { }; },
    Modal: class { constructor(public app: any) { }; open() { }; close() { }; },
    Scope: class { register = vi.fn(); unregister = vi.fn(); },
    Plugin: class { },
    moment: () => ({ format: () => '2026-01-01' })
}));

// 2. Mock svelte (mount/unmount)
vi.mock('svelte', () => ({
    mount: vi.fn(),
    unmount: vi.fn()
}));

// 3. Mock dependencies
// 3. Mock dependencies using vi.hoisted to share state
const mocks = vi.hoisted(() => ({
    loader: {
        load: vi.fn().mockResolvedValue([]),
        loadShortlisted: vi.fn().mockResolvedValue([]),
        loadSpecificFiles: vi.fn().mockResolvedValue([]),
        parser: { resolveTaskMetadata: vi.fn() }
    },
    navManager: {
        setStack: vi.fn(),
        getCurrentStack: vi.fn().mockReturnValue([]),
        drillDown: vi.fn(),
        goBack: vi.fn(),
        getState: vi.fn().mockReturnValue({ history: [], currentSource: '' }),
        setState: vi.fn(),
        refresh: vi.fn().mockResolvedValue(undefined),
        onStackChange: vi.fn().mockReturnValue(() => { }),
        destroy: vi.fn()
    }
}));

vi.mock('../loaders/StackLoader.js', () => ({
    StackLoader: class {
        load = mocks.loader.load;
        loadShortlisted = mocks.loader.loadShortlisted;
        loadSpecificFiles = mocks.loader.loadSpecificFiles;
        parser = mocks.loader.parser;
    }
}));

vi.mock('../navigation/NavigationManager.js', () => ({
    NavigationManager: class {
        setStack = mocks.navManager.setStack;
        getCurrentStack = mocks.navManager.getCurrentStack;
        drillDown = mocks.navManager.drillDown;
        goBack = mocks.navManager.goBack;
        getState = mocks.navManager.getState;
        setState = mocks.navManager.setState;
        refresh = mocks.navManager.refresh;
        onStackChange = mocks.navManager.onStackChange;
        destroy = mocks.navManager.destroy;
    }
}));

vi.mock('../scheduler.js', () => ({
    computeSchedule: vi.fn().mockReturnValue([])
}));

vi.mock('../main.js', () => ({
    // Mock whatever is imported from main.js if needed (likely just types for StackView, but runtime import might happen)
    // If StackView imports values, default export needs to be mocked
    TodoFlowPlugin: class { },
    DEFAULT_SETTINGS: {}
}));

import { StackView } from '../views/StackView.js';

describe('StackView Reload Logic', () => {
    let view: StackView;
    let mockLeaf: any;
    let mockSettings: any;
    let mockHistory: any;
    let mockLogger: any;

    beforeEach(() => {
        mockLeaf = {};
        mockSettings = { timingMode: 'now', keys: { debug: false } };
        mockHistory = {};
        mockLogger = { info: vi.fn(), warn: vi.fn() };

        // Reset mocks
        vi.clearAllMocks();

        view = new StackView(mockLeaf, mockSettings, mockHistory, mockLogger, { saveStack: vi.fn(), loadStackIds: vi.fn() } as any, vi.fn(), vi.fn());
    });

    it('should delegate reload to NavigationManager.refresh()', async () => {
        const testIds = ['file1.md', 'file2.md'];

        // 1. Initial State: Set explicit IDs
        await view.setState({ ids: testIds }, null);

        // Reset calls
        mocks.navManager.refresh.mockClear();

        // 2. Trigger Reload
        await view.reload();

        // 3. Assertions
        // In Phase A, reload() delegates to navManager.refresh()
        expect(mocks.navManager.refresh).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('[StackView] Reload triggered.'));
    });
});
