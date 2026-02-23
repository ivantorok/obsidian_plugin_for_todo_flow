import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StackPersistenceService } from '../services/StackPersistenceService';

describe('BUG-007: Fidelity Write Guard', () => {
    let persistence: StackPersistenceService;
    let mockApp: any;

    beforeEach(() => {
        mockApp = {
            vault: {
                getAbstractFileByPath: vi.fn(),
                read: vi.fn(),
                modify: vi.fn(),
                create: vi.fn(),
                adapter: { exists: vi.fn().mockResolvedValue(true) }
            },
            metadataCache: { getFirstLinkpathDest: vi.fn() },
            fileManager: { processFrontMatter: vi.fn() }
        };
        persistence = new StackPersistenceService(mockApp);
    });

    it('should reject external update if content matches last internal write', async () => {
        const filePath = 'test.md';
        const content = '# Test Content';
        const mockFile = { path: filePath, extension: 'md' };

        mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
        mockApp.vault.read.mockResolvedValue(content);

        // Record an internal write
        persistence.recordInternalWrite(filePath, content);

        // Even if we are AFTER the 2000ms timer, it should still be "internal" if content matches
        const result = await persistence.isExternalUpdate(filePath, []);
        expect(result).toBe(false);
    });

    it('should accept external update if content differs, even if recent', async () => {
        const filePath = 'test.md';
        const oldContent = '# Old Content';
        const newContent = '# New Content';
        const mockFile = { path: filePath, extension: 'md' };

        mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);

        // Record internal write
        persistence.recordInternalWrite(filePath, oldContent);

        // Simulate external change
        mockApp.vault.read.mockResolvedValue(newContent);

        const result = await persistence.isExternalUpdate(filePath, []);
        expect(result).toBe(true);
    });
});
