
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TriageController } from '../views/TriageController.js';

// 1. Mock Obsidian modules
vi.mock('obsidian', () => ({
    ItemView: class {
        constructor(public leaf: any) { }
    },
    WorkspaceLeaf: class { },
    TFile: class { },
    Plugin: class { },
    moment: () => ({ format: () => '2026-01-01' })
}));

describe('TriageController Open Logic', () => {
    let mockApp: any;
    let mockTasks: any[];
    let controller: TriageController;

    beforeEach(() => {
        vi.clearAllMocks();
        mockTasks = [
            { id: 'Folder/Task A.md', title: 'Task A', duration: 30, status: 'todo' }
        ];

        mockApp = {
            workspace: {
                openLinkText: vi.fn()
            },
            vault: {
                getAbstractFileByPath: vi.fn(),
                process: vi.fn()
            }
        };

        controller = new TriageController(mockApp, mockTasks);
    });

    it('should open the current task file when openCurrentTask is called', async () => {
        // ACT
        // @ts-ignore - Method doesn't exist yet
        await controller.openCurrentTask();

        // ASSERT
        expect(mockApp.workspace.openLinkText).toHaveBeenCalledWith(
            'Folder/Task A.md',
            '', // Path context 
            true // Link should be opened, new leaf arg is implementation detail but usually true or false
        );
    });

    it('should do nothing if no current task', async () => {
        const emptyController = new TriageController(mockApp, []);
        // @ts-ignore
        await emptyController.openCurrentTask();
        expect(mockApp.workspace.openLinkText).not.toHaveBeenCalled();
    });
});
