import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StackLoader } from '../loaders/StackLoader.js';

vi.mock('obsidian', () => ({
    TFile: class {
        extension = 'md';
        path = '';
        name = '';
    },
    TFolder: class { children = []; }
}));

describe('StackLoader', () => {
    let mockApp: any;
    let loader: StackLoader;

    beforeEach(() => {
        mockApp = {
            vault: {
                getAbstractFileByPath: vi.fn(),
                read: vi.fn(),
                adapter: {
                    read: vi.fn(),
                    exists: vi.fn()
                }
            },
            metadataCache: {
                getFirstLinkpathDest: vi.fn(),
                getFileCache: vi.fn(),
                resolvedLinks: {}
            }
        };
        loader = new StackLoader(mockApp);
    });

    it('should return empty array for non-existent path', async () => {
        mockApp.vault.getAbstractFileByPath.mockReturnValue(null);
        const tasks = await loader.load('invalid');
        expect(tasks).toEqual([]);
    });

    it('should use LinkParser for TFile', async () => {
        const { TFile } = await import('obsidian');
        const mockFile = new TFile();
        mockFile.path = 'Link.md';
        mockFile.name = 'Link';
        mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
        mockApp.vault.read.mockResolvedValue('[[Link]]');
        mockApp.vault.adapter.read.mockResolvedValue('[[Link]]');
        mockApp.vault.adapter.exists.mockResolvedValue(false); // Link resolution fallback

        const tasks = await loader.load('test.md');
        expect(tasks).toHaveLength(1);
        expect(tasks[0]!.id).toBe('Link.md');
    });

    // Test for TFolder is harder due to dynamic import and GraphBuilder complexity,
    // but the logic is straightforward from StackView.ts
});
