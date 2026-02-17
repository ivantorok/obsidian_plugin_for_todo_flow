import { describe, it, expect, vi } from 'vitest';
import moment from 'moment';
import { GraphBuilder } from '../GraphBuilder.js';
import { type TaskNode } from '../scheduler.js';

// Mock Obsidian types
const mockTFile = (path: string, basename: string) => ({
    path,
    basename,
    name: basename + '.md', // buildNode uses file.name
    extension: 'md',
    stat: { mtime: Date.now(), ctime: Date.now(), size: 100 }
});

describe('GraphBuilder', () => {

    it('should build a simple parent-child graph from links', async () => {
        // Setup
        const fileParent = mockTFile('folder/Parent.md', 'Parent');
        const fileChild = mockTFile('folder/Child.md', 'Child');
        const files = [fileParent, fileChild];

        const mockApp = {
            metadataCache: {
                getFileCache: (file: any) => {
                    if (file.path === 'folder/Parent.md') {
                        return { frontmatter: { status: 'todo' } };
                    }
                    if (file.path === 'folder/Child.md') {
                        return { frontmatter: { status: 'todo' } };
                    }
                    return null;
                },
                resolvedLinks: {
                    'folder/Parent.md': { 'folder/Child.md': 1 },
                    'folder/Child.md': {}
                }
            },
            vault: {
                getAbstractFileByPath: (path: string) => files.find(f => f.path === path),
                read: async (file: any) => "Some content"
            }
        } as any;

        const builder = new GraphBuilder(mockApp);
        const graph = await builder.buildGraph(files as any[]);

        const parentNode = graph.find(n => n.id === 'folder/Parent.md');
        const childNode = graph.find(n => n.id === 'folder/Child.md');

        expect(parentNode).toBeDefined();
        expect(childNode).toBeDefined();

        expect(parentNode!.children).toHaveLength(1);
        expect(parentNode!.children[0]!.id).toBe('folder/Child.md');
    });

    it('should NOT prune children if parent is done (Recursive Durability)', async () => {
        // A (done) -> B (todo)
        const fileA = mockTFile('A.md', 'A');
        const fileB = mockTFile('B.md', 'B');
        const files = [fileA, fileB];

        const mockApp = {
            metadataCache: {
                getFileCache: (file: any) => {
                    if (file.path === 'A.md') return { frontmatter: { status: 'done' } }; // DONE
                    if (file.path === 'B.md') return { frontmatter: { status: 'todo' } };
                    return null;
                },
                resolvedLinks: {
                    'A.md': { 'B.md': 1 },
                    'B.md': {}
                }
            },
            vault: {
                getAbstractFileByPath: (path: string) => files.find(f => f.path === path),
                read: async (file: any) => ""
            }
        } as any;

        const builder = new GraphBuilder(mockApp);
        const graph = await builder.buildGraph(files as any[]);

        const nodeA = graph.find(n => n.id === 'A.md');

        expect(nodeA).toBeDefined();
        expect(nodeA!.status).toBe('done');
        expect(nodeA!.children).toHaveLength(1); // Should NOT be pruned!
        expect(nodeA!.children[0]!.id).toBe('B.md');
    });

    it('should handle circular dependencies gracefully', async () => {
        // A -> B -> A
        const fileA = mockTFile('A.md', 'A');
        const fileB = mockTFile('B.md', 'B');
        const files = [fileA, fileB];

        const mockApp = {
            metadataCache: {
                getFileCache: (file: any) => ({ frontmatter: {} }),
                resolvedLinks: {
                    'A.md': { 'B.md': 1 },
                    'B.md': { 'A.md': 1 }
                }
            },
            vault: {
                getAbstractFileByPath: (path: string) => files.find(f => f.path === path),
                read: async (file: any) => ""
            }
        } as any;

        const builder = new GraphBuilder(mockApp);
        const graph = await builder.buildGraph(files as any[]);

        const nodeA = graph.find(n => n.id === 'A.md');
        const nodeB = graph.find(n => n.id === 'B.md');

        expect(nodeA).toBeDefined();
        // A has child B
        expect(nodeA!.children[0]!.id).toBe('B.md');

        // A -> B -> (Stop, A already visited in this branch)
        expect(nodeA!.children[0]!.children).toHaveLength(0);
    });

    it('should handle diamond dependencies correctly', async () => {
        // A -> B, A -> C, B -> D, C -> D
        const fileA = mockTFile('A.md', 'A');
        const fileB = mockTFile('B.md', 'B');
        const fileC = mockTFile('C.md', 'C');
        const fileD = mockTFile('D.md', 'D');
        const files = [fileA, fileB, fileC, fileD];

        const mockApp = {
            metadataCache: {
                getFileCache: (file: any) => ({ frontmatter: {} }),
                resolvedLinks: {
                    'A.md': { 'B.md': 1, 'C.md': 1 },
                    'B.md': { 'D.md': 1 },
                    'C.md': { 'D.md': 1 },
                    'D.md': {}
                }
            },
            vault: {
                getAbstractFileByPath: (path: string) => files.find(f => f.path === path),
                read: async (file: any) => ""
            }
        } as any;

        const builder = new GraphBuilder(mockApp);
        const graph = await builder.buildGraph(files as any[]);

        const nodeA = graph.find(n => n.id === 'A.md');

        // A has B and C
        expect(nodeA!.children).toHaveLength(2);

        const childB = nodeA!.children.find(c => c.id === 'B.md');
        const childC = nodeA!.children.find(c => c.id === 'C.md');

        // B has D
        expect(childB!.children[0]!.id).toBe('D.md');
        // C has D
        expect(childC!.children[0]!.id).toBe('D.md');
    });

    it('should resolve title from frontmatter "task" field preferentially', async () => {
        const file = mockTFile('Task.md', 'Task');
        const mockApp = {
            metadataCache: {
                getFileCache: () => ({ frontmatter: { task: 'Priority 1 Title' } }),
                resolvedLinks: { 'Task.md': {} }
            },
            vault: {
                getAbstractFileByPath: () => file,
                read: async () => "# Priority 2 Title\nContent"
            }
        } as any;

        const builder = new GraphBuilder(mockApp);
        const [node] = await builder.buildGraph([file as any]);
        expect(node!.title).toBe('Priority 1 Title');
    });

    it('should resolve title from first line if "task" field is missing', async () => {
        const file = mockTFile('Task.md', 'Task');
        const mockApp = {
            metadataCache: {
                getFileCache: () => ({ frontmatter: {} }),
                resolvedLinks: { 'Task.md': {} }
            },
            vault: {
                getAbstractFileByPath: () => file,
                read: async () => "# Priority 2 Title\nContent"
            }
        } as any;

        const builder = new GraphBuilder(mockApp);
        const [node] = await builder.buildGraph([file as any]);
        expect(node!.title).toBe('Priority 2 Title');
    });

    it('should fallback to filename if no metadata or content title found', async () => {
        const file = mockTFile('Task.md', 'Task');
        const mockApp = {
            metadataCache: {
                getFileCache: () => ({ frontmatter: {} }),
                resolvedLinks: { 'Task.md': {} }
            },
            vault: {
                getAbstractFileByPath: () => file,
                read: async () => ""
            }
        } as any;

        const builder = new GraphBuilder(mockApp);
        const [node] = await builder.buildGraph([file as any]);
        expect(node!.title).toBe('Task');
    });
});
