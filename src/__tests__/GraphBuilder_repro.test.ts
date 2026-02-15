
import { describe, test, expect, vi } from 'vitest';
import { GraphBuilder } from './GraphBuilder.repro.js';
import { DateParser } from '../utils/DateParser';
import moment from 'moment';

// Mock Obsidian classes
class MockTFile {
    path: string;
    name: string;
    extension: string = 'md';
    val: any; // prevent structural typing issues
    constructor(path: string) {
        this.path = path;
        this.name = path.split('/').pop() || path;
    }
}



describe('GraphBuilder Crash Reproduction', () => {
    const mockApp = {
        vault: {
            getAbstractFileByPath: vi.fn(),
            read: vi.fn()
        },
        metadataCache: {
            getFileCache: vi.fn(),
            resolvedLinks: {}
        }
    } as any;

    const builder = new GraphBuilder(mockApp);

    test('should handle numeric file names', async () => {
        const file = new MockTFile('12345.md');
        mockApp.metadataCache.getFileCache.mockReturnValue({});
        mockApp.vault.read.mockResolvedValue('Some content');

        // This exercises resolveTaskTitle with numeric filename
        const node = await builder['buildNode'](file as any, []);
        expect(node.title).toBe('12345');
    });

    test('should handle numeric frontmatter task title', async () => {
        const file = new MockTFile('test.md');
        mockApp.metadataCache.getFileCache.mockReturnValue({
            frontmatter: { task: 2024 }
        });
        mockApp.vault.read.mockResolvedValue('Some content');

        const node = await builder['buildNode'](file as any, []);
        expect(node.title).toBe('2024');
    });

    test('should handle numeric start time in frontmatter', async () => {
        const file = new MockTFile('test.md');
        mockApp.metadataCache.getFileCache.mockReturnValue({
            frontmatter: { startTime: 1234567890000 }
        });
        mockApp.vault.read.mockResolvedValue('Some content');

        const node = await builder['buildNode'](file as any, []);
        expect(node.startTime).toBeDefined();
    });

    test('should handle object start time in frontmatter (moment-like?)', async () => {
        const file = new MockTFile('test.md');
        // A weird object that might confuse moment
        const weirdObj = { match: 'not a function', _isAMomentObject: false };
        mockApp.metadataCache.getFileCache.mockReturnValue({
            frontmatter: { startTime: weirdObj }
        });
        mockApp.vault.read.mockResolvedValue('Some content');

        // This might crash if moment tries to check for match?
        try {
            await builder['buildNode'](file as any, []);
        } catch (e) {
            console.error(e);
            throw e;
        }
    });
});
