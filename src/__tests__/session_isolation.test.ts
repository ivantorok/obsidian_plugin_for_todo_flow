
import { describe, test, expect, beforeEach, vi } from 'vitest';

// --- Obsidian Mocking ---
vi.mock('obsidian', () => {
    class MockTFile {
        path: string;
        basename: string;
        extension: string = 'md';
        constructor(path: string) {
            this.path = path;
            this.basename = path.split('/').pop()?.replace('.md', '') || '';
        }
    }

    class MockTFolder {
        path: string;
        children: any[] = [];
        constructor(path: string) {
            this.path = path;
        }
    }

    return {
        TFile: MockTFile,
        TFolder: MockTFolder,
        App: vi.fn(),
        Vault: vi.fn(),
        MetadataCache: vi.fn(),
        ItemView: vi.fn(),
        WorkspaceLeaf: vi.fn()
    };
});

// Now import the system under test
import { StackLoader } from '../loaders/StackLoader.js';
import { TFile } from 'obsidian';

// Mock GraphBuilder specifically
vi.mock('../GraphBuilder.js', () => {
    return {
        GraphBuilder: class {
            async buildGraph(files: any[]) {
                // Return files as simple task nodes
                return files.map(f => ({
                    id: f.path,
                    title: f.basename,
                    status: 'todo',
                    duration: 30,
                    children: []
                }));
            }
        }
    };
});

// Mock LinkParser
vi.mock('../parsers/LinkParser.js', () => {
    return {
        LinkParser: class {
            async parse() { return []; }
        }
    };
});

describe('Session Isolation (Tray Concept)', () => {
    let loader: StackLoader;
    let mockApp: any;
    let mockGetAbstractFileByPath: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockGetAbstractFileByPath = vi.fn();
        mockApp = {
            vault: {
                getAbstractFileByPath: mockGetAbstractFileByPath
            },
            metadataCache: {
                getFileCache: vi.fn()
            }
        };

        loader = new StackLoader(mockApp as any, console as any);
    });

    test('loadSpecificFiles loads ONLY the requested files, ignoring others', async () => {
        // Setup files
        // @ts-ignore
        const fileA = new TFile('old_session/task_a.md');
        // @ts-ignore
        const fileB = new TFile('new_session/task_b.md');
        // @ts-ignore
        const fileC = new TFile('new_session/task_c.md');

        mockGetAbstractFileByPath.mockImplementation((path: string) => {
            if (path === fileA.path) return fileA;
            if (path === fileB.path) return fileB;
            if (path === fileC.path) return fileC;
            return null;
        });

        // The "Tray" contains only B and C
        const currentSessionIDs = [fileB.path, fileC.path];

        // Act
        const results = await loader.loadSpecificFiles(currentSessionIDs);

        // Assert
        expect(results.length).toBe(2);
        const ids = results.map(t => t.id);
        expect(ids).toContain(fileB.path);
        expect(ids).toContain(fileC.path);
        expect(ids).not.toContain(fileA.path);

        // Verify we only requested the files in the tray
        expect(mockGetAbstractFileByPath).toHaveBeenCalledWith(fileB.path);
        expect(mockGetAbstractFileByPath).toHaveBeenCalledWith(fileC.path);
    });
});
