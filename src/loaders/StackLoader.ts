import { type App, TFolder, TFile } from 'obsidian';
import { type TaskNode } from '../scheduler.js';
import { LinkParser } from '../parsers/LinkParser.js';
import { FileLogger } from '../logger.js';

/**
 * StackLoader - Unified service to load tasks from any Obsidian path
 */
export class StackLoader {
    private app: App;
    public parser: LinkParser;
    private logger: FileLogger | undefined;

    constructor(app: App, logger?: FileLogger) {
        this.app = app;
        this.logger = logger;
        this.parser = new LinkParser(app);
    }

    /**
     * Load tasks from a path (file or folder)
     */
    async load(path: string): Promise<TaskNode[]> {
        if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[StackLoader] load("${path}") called.`);

        if (path === 'QUERY:SHORTLIST') {
            return this.loadShortlisted();
        }

        const fileOrFolder = this.app.vault.getAbstractFileByPath(path);

        if (!fileOrFolder) {
            if (this.logger) await this.logger.warn(`[StackLoader] [UNHAPPY] Path not found: "${path}"`);
            console.warn(`[StackLoader] Path not found: "${path}"`);
            return [];
        }

        if (this.logger) this.logger.info(`[StackLoader] Found abstract file: ${fileOrFolder.path} (isFolder: ${fileOrFolder instanceof TFolder})`);

        try {
            if (fileOrFolder instanceof TFolder) {
                // It's a folder - use GraphBuilder
                const { GraphBuilder } = await import('../GraphBuilder.js');
                const builder = new GraphBuilder(this.app);
                const files = fileOrFolder.children.filter(f => f instanceof TFile && f.extension === 'md') as TFile[];
                const result = await builder.buildGraph(files);
                if (result.length === 0 && this.logger) await this.logger.warn(`[StackLoader] Folder "${path}" loaded 0 tasks.`);
                return result;
            } else if (fileOrFolder instanceof TFile) {
                // It's a file - use LinkParser to find children, then GraphBuilder to recurse
                const linkedNodes = await this.parser.parse(path);

                // Resolve TFiles from linked nodes
                const linkedFiles = linkedNodes
                    .map(node => this.app.vault.getAbstractFileByPath(node.id))
                    .filter(f => f instanceof TFile) as TFile[];

                // Use GraphBuilder to build the deep graph
                const { GraphBuilder } = await import('../GraphBuilder.js');
                const builder = new GraphBuilder(this.app);
                const graphNodes = await builder.buildGraph(linkedFiles);

                // Merge metadata from linkedNodes (the stack file) into graphNodes
                // Priority: Line-local overrides (LinkParser) > File-level metadata (GraphBuilder)
                return graphNodes.map(gNode => {
                    const lNode = linkedNodes.find(ln => ln.id === gNode.id);
                    if (lNode) {
                        return {
                            ...gNode,
                            // Use line-local title if it's NOT just the linkPath (i.e. it was [[ID|Title]])
                            title: (lNode.title !== lNode.id && lNode.title !== lNode.id.split('/').pop()?.replace('.md', '')) ? lNode.title : gNode.title,
                            isAnchored: lNode.isAnchored || gNode.isAnchored,
                            startTime: lNode.startTime || gNode.startTime,
                            duration: lNode.duration !== 30 ? lNode.duration : gNode.duration // 30 is default
                        };
                    }
                    return gNode;
                });
            }
        } catch (e) {
            if (this.logger) await this.logger.error(`[StackLoader] CRITICAL ERROR loading path "${path}": ${e}`);
            console.error(e);
        }

        return [];
    }

    async loadShortlisted(): Promise<TaskNode[]> {
        const { TaskQueryService } = await import('../services/TaskQueryService.js');
        if (this.logger) await this.logger.info(`[StackLoader] loadShortlisted() called.`);
        const queryService = new TaskQueryService(this.app, this.logger);
        const tasks = await queryService.getShortlistedTasks();
        if (this.logger) await this.logger.info(`[StackLoader] loadShortlisted() returning ${tasks.length} tasks.`);
        return tasks;
    }

    /**
     * Load a specific set of files by ID (path), bypassing global query.
     * This provides Session Isolation.
     */
    async loadSpecificFiles(ids: string[]): Promise<TaskNode[]> {
        if (this.logger) await this.logger.info(`[StackLoader] loadSpecificFiles() entry with ${ids.length} IDs: ${JSON.stringify(ids)}`);

        try {
            const { GraphBuilder } = await import('../GraphBuilder.js');
            const builder = new GraphBuilder(this.app, this.logger); // Pass logger
            const nodes = await builder.buildGraph(ids);

            if (this.logger) await this.logger.info(`[StackLoader] loadSpecificFiles() returning ${nodes.length} nodes.`);
            return nodes;
        } catch (e) {
            if (this.logger) await this.logger.error(`[StackLoader] CRITICAL ERROR in loadSpecificFiles: ${e instanceof Error ? e.stack : e}`);
            console.error(e);
            return [];
        }
    }
}
