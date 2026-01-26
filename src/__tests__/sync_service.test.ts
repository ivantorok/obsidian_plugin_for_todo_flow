import { describe, it, expect, vi } from 'vitest';
import { TFile, type App } from 'obsidian';
import { SyncService } from '../services/SyncService.js';

vi.mock('obsidian', () => {
    return {
        TFile: class {
            extension: string;
            path: string;
            constructor(path: string, extension: string) {
                this.path = path;
                this.extension = extension;
            }
        },
        Notice: class { }
    };
});

// Logic we want to verify:
// 1. Parse export content
// 2. Find completed tasks
// 3. Resolve file paths
// 4. Update file metadata

// We'll likely put this logic in a SyncService class or function.
// Let's TDD a `SyncService` class.

describe('SyncService', () => {
    it('should identify completed tasks in export and update their source files', async () => {
        // Mock Vault
        const mockVault = {
            getAbstractFileByPath: vi.fn(),
            process: vi.fn(),
            // Mock getFirstLinkpathDest if needed, though not used in this specific test case path
            getFirstLinkpathDest: vi.fn()
        };
        const mockApp = {
            vault: mockVault,
            metadataCache: { getFirstLinkpathDest: vi.fn() }
        } as unknown as App;

        const service = new SyncService(mockApp);

        // Setup mock file using the mocked class
        // @ts-ignore
        const mockFile = new TFile('path/to/task.md', 'md');
        mockVault.getAbstractFileByPath.mockReturnValue(mockFile);

        const exportContent = `## Daily Stack
- [ ] 09:00 [[path/to/pending.md|Task A]] (30m)
- [x] 10:00 [[path/to/task.md|Task B]] (45m)
`;

        const count = await service.syncExportToVault(exportContent);

        expect(count).toBe(1);
        expect(mockVault.getAbstractFileByPath).toHaveBeenCalledWith('path/to/task.md');
        expect(mockVault.process).toHaveBeenCalledWith(mockFile, expect.any(Function));
    });

    it('should ignore pending tasks', async () => {
        const mockVault = { getAbstractFileByPath: vi.fn(), process: vi.fn() };
        const mockApp = { vault: mockVault } as unknown as App;
        const service = new SyncService(mockApp);

        const exportContent = `- [ ] 09:00 [[path/to/pending.md|Task A]]`;
        const count = await service.syncExportToVault(exportContent);

        expect(count).toBe(0);
        expect(mockVault.process).not.toHaveBeenCalled();
    });
});
