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
        if (path === 'QUERY:SHORTLIST') {
            return this.loadShortlisted();
        }

        const fileOrFolder = this.app.vault.getAbstractFileByPath(path);

        if (!fileOrFolder) {
            return [];
        }

        if (fileOrFolder instanceof TFolder) {
            // It's a folder - use GraphBuilder
            const { GraphBuilder } = await import('../GraphBuilder.js');
            const builder = new GraphBuilder(this.app);
            const files = fileOrFolder.children.filter(f => f instanceof TFile && f.extension === 'md') as TFile[];
            return await builder.buildGraph(files);
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
            return await builder.buildGraph(linkedFiles);
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
        if (this.logger) await this.logger.info(`[StackLoader] loadSpecificFiles() entry with ${ids.length} IDs.`);

        const files: TFile[] = [];
        for (const id of ids) {
            const file = this.app.vault.getAbstractFileByPath(id);
            if (file instanceof TFile && file.extension === 'md') {
                files.push(file);
                if (this.logger) await this.logger.info(`[StackLoader] RESOLVED: ${id}`);
            } else {
                if (this.logger) await this.logger.info(`[StackLoader] FAILED: ${id} (Not found or not markdown)`);
            }
        }

        if (this.logger) await this.logger.info(`[StackLoader] Total Resolved: ${files.length} valid files.`);

        const { GraphBuilder } = await import('../GraphBuilder.js');
        const builder = new GraphBuilder(this.app);
        return await builder.buildGraph(files);
    }
}
