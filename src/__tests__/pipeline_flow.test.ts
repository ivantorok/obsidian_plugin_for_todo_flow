import { describe, it, expect, vi } from 'vitest';
import { type App } from 'obsidian';
import { TaskQueryService } from '../services/TaskQueryService.js';
import { DumpController } from '../views/DumpController.js';
import { TriageController } from '../views/TriageController.js';

// Global cache mock to share state between App mock and GraphBuilder mock
const cacheMap = new Map<string, any>();

// Mock GraphBuilder globally
vi.mock('../GraphBuilder.js', () => {
    return {
        GraphBuilder: class {
            constructor() { }
            buildGraph(files: any[]) {
                return Promise.resolve(files.map(f => ({
                    id: f.path,
                    title: f.path,
                    // Simulate internal logic relying on cache or file state
                    flow_state: cacheMap.get(f.path)?.frontmatter?.flow_state
                })));
            }
        }
    }
});

describe('Pipeline Integration', () => {
    const mockFiles: any[] = [];

    const mockApp = {
        vault: {
            getFiles: () => mockFiles,
            getAbstractFileByPath: (path: string) => mockFiles.find(f => f.path === path),
            createFolder: async (path: string) => Promise.resolve(),
            create: async (path: string, content: string) => {
                console.log('Mock Create called:', path);
                const file = { path, extension: 'md' };
                mockFiles.push(file);
                // Extract metadata (rudimentary parser)
                const flowStateMatch = content.match(/flow_state: (\w+)/);
                const flowState = flowStateMatch ? flowStateMatch[1] : undefined;
                cacheMap.set(path, { frontmatter: { flow_state: flowState } });
                return Promise.resolve(file);
            },
            process: async (file: any, cb: (content: string) => string) => {
                // Determine current state based on cache to simulate reading file
                const currentState = cacheMap.get(file.path)?.frontmatter?.flow_state || 'dump';
                const currentContent = `flow_state: ${currentState}`;

                const newContent = cb(currentContent);
                const flowStateMatch = newContent.match(/flow_state: (\w+)/);
                const flowState = flowStateMatch ? flowStateMatch[1] : undefined;

                cacheMap.set(file.path, { frontmatter: { flow_state: flowState } });
                return Promise.resolve();
            }
        },
        metadataCache: {
            getCache: (pathOrFile: string | any) => {
                const path = typeof pathOrFile === 'string' ? pathOrFile : pathOrFile.path;
                return cacheMap.get(path) || null;
            }
        }
    } as unknown as App;

    it('should flow from Dump -> Triage -> Shortlist -> Stack', async () => {
        // 1. Dump
        const dumpCtrl = new DumpController(mockApp, 'todo-flow');
        await dumpCtrl.submitThought('My Idea');

        const dumpFiles = mockFiles.filter(f => f.path.includes('My-Idea'));
        expect(dumpFiles.length).toBe(1);
        const ideaFile = dumpFiles[0];

        // Verify metadata (simulated by our mock create)
        expect(cacheMap.get(ideaFile.path).frontmatter.flow_state).toBe('dump');

        // 2. Triage Query (Dumped)
        const queryService = new TaskQueryService(mockApp);
        const dumpedTasks = await queryService.getDumpedTasks();
        expect(dumpedTasks).toHaveLength(1);
        expect(dumpedTasks[0]!.id).toBe(ideaFile.path);

        // 3. Triage Action (Swipe Right)
        const triageCtrl = new TriageController(mockApp, dumpedTasks);
        // Simulate selecting the task (index 0)
        await triageCtrl.swipeRight();

        // Verify state update
        expect(cacheMap.get(ideaFile.path).frontmatter.flow_state).toBe('shortlist');

        // 4. Stack Query (Shortlist)
        const shortlistedTasks = await queryService.getShortlistedTasks();
        expect(shortlistedTasks).toHaveLength(1);
        expect(shortlistedTasks[0]!.id).toBe(ideaFile.path);

        // 5. Ensure it's no longer in Dump query
        const dumpsAgain = await queryService.getDumpedTasks();
        expect(dumpsAgain).toHaveLength(0);
    });
});
