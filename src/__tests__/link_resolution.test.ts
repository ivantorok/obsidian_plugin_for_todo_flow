import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LinkParser } from '../parsers/LinkParser.js';

describe('LinkParser - Link Resolution', () => {
    let mockApp: any;
    let parser: LinkParser;

    beforeEach(() => {
        mockApp = {
            vault: {
                adapter: {
                    read: vi.fn(),
                    exists: vi.fn()
                }
            },
            metadataCache: {
                getFirstLinkpathDest: vi.fn()
            }
        };
        parser = new LinkParser(mockApp);
    });

    it('should resolve relative links to full vault paths', async () => {
        const sourcePath = 'todo-flow/parent.md';
        const linkText = 'child';
        const resolvedPath = 'todo-flow/child.md';

        mockApp.vault.adapter.read.mockResolvedValue('[[child]]');
        mockApp.metadataCache.getFirstLinkpathDest.mockReturnValue({
            path: resolvedPath
        });
        mockApp.vault.adapter.exists.mockResolvedValue(true);

        const tasks = await parser.parse(sourcePath);

        expect(tasks).toHaveLength(1);
        expect(tasks[0]!.id).toBe(resolvedPath);
        // Ensure getFirstLinkpathDest was called with the correct context
        expect(mockApp.metadataCache.getFirstLinkpathDest).toHaveBeenCalledWith('child', sourcePath);
    });

    it('should fall back to filename if resolution fails', async () => {
        const sourcePath = 'parent.md';
        mockApp.vault.adapter.read.mockResolvedValue('[[missing]]');
        mockApp.metadataCache.getFirstLinkpathDest.mockReturnValue(null);
        mockApp.vault.adapter.exists.mockResolvedValue(false);

        const tasks = await parser.parse(sourcePath);

        expect(tasks).toHaveLength(1);
        expect(tasks[0]!.id).toBe('missing.md');
    });
});
