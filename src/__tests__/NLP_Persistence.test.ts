import { describe, it, expect, vi } from 'vitest';
import { GraphBuilder } from '../GraphBuilder.js';
import { type TaskNode } from '../scheduler.js';

// Mock Obsidian types
const mockTFile = (path: string, basename: string) => ({
    path,
    basename,
    name: basename + '.md',
    extension: 'md',
    stat: { mtime: Date.now(), ctime: Date.now(), size: 100 }
});

describe('NLP Persistence in GraphBuilder', () => {
    it('should detect an anchor in a file header/title during initial load', async () => {
        const file = mockTFile('todo/Routine 08:00.md', 'Routine 08:00');
        const files = [file];

        const mockApp = {
            metadataCache: {
                getFileCache: (f: any) => ({ frontmatter: {} }), // No explicit frontmatter anchor
                resolvedLinks: {}
            },
            vault: {
                getAbstractFileByPath: (path: string) => files.find(f => f.path === path),
                read: async (f: any) => "# Routine 08:00" // Anchor is in the title/first line
            }
        } as any;

        const builder = new GraphBuilder(mockApp);
        const graph = await builder.buildGraph(files as any[]);

        const node = graph.find(n => n.id === 'todo/Routine 08:00.md');

        expect(node).toBeDefined();
        expect(node!.title).toBe('Routine'); // NLP should strip the time from display title
        expect(node!.isAnchored).toBe(true);
        expect(node!.startTime?.format('HH:mm')).toBe('08:00');
    });

    it('should detect an anchor when submitting a thought to DumpController', async () => {
        const mockApp = {
            vault: {
                getAbstractFileByPath: (p: string) => null, // Folder exists check
                createFolder: async (p: string) => { },
                create: vi.fn().mockResolvedValue(null)
            }
        } as any;

        const { DumpController } = await import('../views/DumpController.js');
        const controller = new DumpController(mockApp, 'todo');
        const node = await controller.submitThought('Meeting 14:00');

        expect(node).toBeDefined();
        expect(node!.title).toBe('Meeting');
        expect(node!.isAnchored).toBe(true);
        expect(node!.startTime?.format('HH:mm')).toBe('14:00');

        // Verify vault.create received frontmatter with anchor
        const call = mockApp.vault.create.mock.calls[0];
        const content = call[1];
        expect(content).toContain('anchored: true');
        expect(content).toContain('startTime:');
    });
});
