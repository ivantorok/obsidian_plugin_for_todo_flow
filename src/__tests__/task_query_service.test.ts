import { describe, it, expect, vi } from 'vitest';
import type { App, TFile } from 'obsidian';
import { TaskQueryService } from '../services/TaskQueryService.js';
import { type TaskNode } from '../scheduler.js';

// Mock dependencies
const mockBuildGraph = vi.fn();
vi.mock('../GraphBuilder.js', () => {
    return {
        GraphBuilder: class {
            constructor() { }
            buildGraph(files: TFile[]) { return mockBuildGraph(files); }
        }
    };
});

describe('TaskQueryService', () => {
    const mockFile1 = { path: 'dump.md', extension: 'md' } as TFile;
    const mockFile2 = { path: 'short.md', extension: 'md' } as TFile;
    const mockFile3 = { path: 'other.md', extension: 'md' } as TFile;
    const mockFiles = [mockFile1, mockFile2, mockFile3];

    const mockApp = {
        vault: {
            getFiles: () => mockFiles,
            getAbstractFileByPath: (path: string) => mockFiles.find(f => f.path === path)
        },
        metadataCache: {
            getCache: (pathOrFile: string) => {
                // Determine path depending on what's passed (Obsidian API usually takes path string)
                // But in the implementation we called it with `file.path`.
                // Actually, api is app.metadataCache.getCache(path: string) -> CachedMetadata | null
                const path = typeof pathOrFile === 'string' ? pathOrFile : (pathOrFile as any).path;

                if (path === 'dump.md') return { frontmatter: { flow_state: 'dump' } };
                if (path === 'short.md') return { frontmatter: { flow_state: 'shortlist' } };
                return { frontmatter: {} };
            }
        }
    } as unknown as App;

    it('should retrieve dumped tasks', async () => {
        // Setup mock builder response
        const mockTasks: TaskNode[] = [
            { id: 'dump.md', title: 'Dump Task', status: 'todo', duration: 30, isAnchored: false, children: [] }
        ];
        mockBuildGraph.mockResolvedValue(mockTasks);

        const service = new TaskQueryService(mockApp);
        const tasks = await service.getDumpedTasks();

        expect(tasks).toHaveLength(1);
        expect(tasks[0]!.id).toBe('dump.md');
        // Verify only 'dump' files were passed to builder
        expect(mockBuildGraph).toHaveBeenCalled();
        const calledFiles = mockBuildGraph.mock.calls[0]![0] as TFile[];
        expect(calledFiles).toHaveLength(1);
        expect(calledFiles[0]!.path).toBe('dump.md');
    });

    it('should retrieve shortlisted tasks', async () => {
        // Setup mock builder response
        const mockTasks: TaskNode[] = [
            { id: 'short.md', title: 'Short Task', status: 'todo', duration: 30, isAnchored: false, children: [] }
        ];
        mockBuildGraph.mockResolvedValue(mockTasks);

        const service = new TaskQueryService(mockApp);
        const tasks = await service.getShortlistedTasks();

        expect(tasks).toHaveLength(1);
        expect(tasks[0]!.id).toBe('short.md');
    });
});
