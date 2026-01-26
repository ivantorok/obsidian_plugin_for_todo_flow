
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StackLoader } from '../loaders/StackLoader.js';
import { type App, TFile, TFolder } from 'obsidian';

// Mock Obsidian types
const mockApp = {
    vault: {
        getAbstractFileByPath: vi.fn(),
        read: vi.fn(), // Needed for GraphBuilder
        getFiles: vi.fn(),
        adapter: {
            read: vi.fn(),
            exists: vi.fn()
        }
    },
    metadataCache: {
        getFileCache: vi.fn(),
        resolvedLinks: {}, // Important for GraphBuilder
        getFirstLinkpathDest: vi.fn()
    }
} as unknown as App;

vi.mock('obsidian', async (importOriginal) => {
    // Define mock classes within the factory
    class MockTFile {
        extension: string = 'md';
        path: string;
        name: string;
        constructor(path: string) {
            this.path = path || '';
            this.name = path || '';
        }
    }
    class MockTFolder {
        children: any[] = [];
        path: string;
        constructor(path: string) { this.path = path || ''; }
    }

    return {
        ...await importOriginal<any>(),
        TFile: MockTFile,
        TFolder: MockTFolder
    };
});

describe('StackLoader Integration', () => {
    let loader: StackLoader;

    beforeEach(() => {
        vi.clearAllMocks();
        loader = new StackLoader(mockApp);
    });

    it('should load children recursively even for single file drill-down', async () => {
        // Setup: Parent -> Child -> Grandchild -> GreatGrandchild

        // 1. Files - use the imported TFile which now maps to our MockTFile
        // We cast them as any because Typescript doesn't know TFile has a public constructor with arguments like we mocked
        const parentFile = new (TFile as any)('parent.md');
        const childFile = new (TFile as any)('child.md');
        const grandchildFile = new (TFile as any)('grandchild.md');
        const greatGrandchildFile = new (TFile as any)('gg.md');

        // 2. Mocks for file existence
        (mockApp.vault.getAbstractFileByPath as any).mockImplementation((path: string) => {
            if (path === 'parent.md') return parentFile;
            if (path === 'child.md') return childFile;
            if (path === 'grandchild.md') return grandchildFile;
            if (path === 'gg.md') return greatGrandchildFile;
            return null;
        });

        // 3. Mocks for GraphBuilder (it needs metadataCache and vault.read)
        (mockApp.metadataCache.getFileCache as any).mockReturnValue({ frontmatter: { duration: 10 } });

        // 4. Resolved Links (The Graph!)
        // Parent links to Child
        // Child links to Grandchild
        // Grandchild links to GG
        (mockApp.metadataCache as any).resolvedLinks = {
            'parent.md': { 'child.md': 1 },
            'child.md': { 'grandchild.md': 1 },
            'grandchild.md': { 'gg.md': 1 },
            'gg.md': {}
        };

        // 5. File Content (GraphBuilder reads this to find title if not in frontmatter)
        (mockApp.vault.read as any).mockResolvedValue('Some content');

        // LinkParser uses adapter.read
        (mockApp.vault.adapter.read as any).mockResolvedValue(`
[[grandchild.md]]
        `);
        (mockApp.vault.adapter.exists as any).mockResolvedValue(true);

        // LinkParser uses getFirstLinkpathDest to resolve TFiles from paths
        (mockApp.metadataCache.getFirstLinkpathDest as any).mockImplementation((path: string) => {
            return new (TFile as any)(path);
        });

        // Execute: Load the child file (Drill Down Scenario)
        // Note: In drill-down, we clicked on the child task from the parent view.
        // So we are asking to load 'child.md' as the new root.
        // StackLoader.load() should return the tasks IN 'child.md', which is 'grandchild.md'.
        // AND 'grandchild.md' should be populated with its own children found in 'grandchild.md', which is 'gg.md'.
        const stack = await loader.load('child.md');

        expect(stack.length).toBeGreaterThan(0);
        const grandchildNode = stack.find((t: any) => t.id === 'grandchild.md');
        expect(grandchildNode).toBeDefined();

        // PROOF OF RECURSION:
        // Grandchild should have 'gg.md' as a child.
        // If LinkParser is used (current shallow behavior), children will be [].
        // If GraphBuilder is used (recursive), children will be populated.
        expect(grandchildNode!.children.length).toBeGreaterThan(0);
        expect(grandchildNode!.children[0]!.id).toBe('gg.md');
    });
});
