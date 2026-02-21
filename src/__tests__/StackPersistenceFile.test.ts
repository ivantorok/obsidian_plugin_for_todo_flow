import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { App, TFile, Vault } from 'obsidian';
import { StackPersistenceService } from '../services/StackPersistenceService.js';
import type { TaskNode } from '../scheduler.js';
import moment from 'moment';

// Mock Obsidian types
const mockVault = {
    getAbstractFileByPath: vi.fn(),
    create: vi.fn(),
    modify: vi.fn(),
    read: vi.fn(),
    adapter: {
        exists: vi.fn(),
        write: vi.fn(),
        read: vi.fn()
    },
    on: vi.fn()
};

const mockApp = {
    vault: mockVault,
    metadataCache: {
        getFileCache: vi.fn(),
        getFirstLinkpathDest: vi.fn()
    }
} as unknown as App;

describe('StackPersistenceService', () => {
    let service: StackPersistenceService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new StackPersistenceService(mockApp);
    });

    const mockTasks: TaskNode[] = [
        {
            id: 'task1.md',
            title: 'Task 1',
            duration: 30,
            status: 'todo',
            isAnchored: false,
            children: []
        },
        {
            id: 'task2.md',
            title: 'Task 2',
            duration: 15,
            status: 'done',
            isAnchored: true,
            children: []
        }
    ];

    it('should save stack to a markdown file', async () => {
        const filePath = 'CurrentStack.md';

        // Mock file doesn't exist initially
        mockVault.getAbstractFileByPath.mockReturnValue(null);

        await service.saveStack(mockTasks, filePath);

        expect(mockVault.create).toHaveBeenCalledWith(filePath, expect.stringContaining('- [ ] [[task1.md]]'));
        expect(mockVault.create).toHaveBeenCalledWith(filePath, expect.stringContaining('- [x] [[task2.md]]'));
    });

    it('should load stack from a markdown file', async () => {
        const filePath = 'CurrentStack.md';
        const fileContent = `
- [ ] [[task1.md]]
- [x] [[task2.md]]
        `;

        const mockFile = { path: filePath, extension: 'md' } as TFile;
        mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
        mockVault.read.mockResolvedValue(fileContent);

        // We need to mock the parsing logic or graph builder if used inside
        // For now, let's assume the service parses the links

        const loadedIds = await service.loadStackIds(filePath);

        expect(loadedIds).toEqual(['task1.md', 'task2.md']);
    });

    it('should overwrite existing stack file', async () => {
        const filePath = 'CurrentStack.md';
        const mockFile = { path: filePath, extension: 'md' } as TFile;

        // Mock file exists
        mockVault.getAbstractFileByPath.mockReturnValue(mockFile);

        await service.saveStack(mockTasks, filePath);

        expect(mockVault.modify).toHaveBeenCalledWith(mockFile, expect.any(String));
        expect(mockVault.create).not.toHaveBeenCalled();
    });

    describe('isExternalUpdate (Metadata-based)', () => {
        let mockFile: TFile;
        const filePath = 'CurrentStack.md';

        beforeEach(() => {
            mockFile = { path: filePath, extension: 'md' } as TFile;
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
        });

        it('should return false if explicitly silenced', async () => {
            service.silence(filePath, 5000);
            const isExternal = await service.isExternalUpdate(filePath, mockTasks);
            expect(isExternal).toBe(false);
            expect(mockVault.read).not.toHaveBeenCalled();
        });

        it('should return false if disk content matches in-memory tasks (internal echo)', async () => {
            // Mock file content matching `mockTasks`
            const fileContent = `
- [ ] [[task1.md]]
- [x] [[task2.md]]
            `;
            mockVault.read.mockResolvedValue(fileContent);

            const isExternal = await service.isExternalUpdate(filePath, mockTasks);
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
            expect(isExternal).toBe(false);
        });

        it('should return true if disk content differs (missing/added task)', async () => {
            const fileContent = `
- [ ] [[task1.md]]
- [x] [[task2.md]]
- [ ] [[sync_added_task.md]]
            `;
            mockVault.read.mockResolvedValue(fileContent);

            const isExternal = await service.isExternalUpdate(filePath, mockTasks);
            expect(isExternal).toBe(true);
        });

        it('should return true if disk content status differs (sync checkbox toggle)', async () => {
            const fileContent = `
- [x] [[task1.md]]
- [x] [[task2.md]]
            `;
            // original mockTasks has task1.md as [ ] (status: 'todo')
            mockVault.read.mockResolvedValue(fileContent);

            const isExternal = await service.isExternalUpdate(filePath, mockTasks);
            expect(isExternal).toBe(true);
        });
    });
});
