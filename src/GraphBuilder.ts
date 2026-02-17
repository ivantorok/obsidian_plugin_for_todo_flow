import { App, TFile } from 'obsidian';
import { type TaskNode } from './scheduler.js';
import { resolveTaskTitle, getFirstNonMetadataLine } from './utils/title-resolver.js';
import { DateParser } from './utils/DateParser.js';
import moment from 'moment';

export class GraphBuilder {
    private maxDepth: number = 5;

    constructor(private app: App, private logger?: any) {
        // Access settings via plugin if possible, or use a default
        // For now, let's assume we can pass it or get it from app
        const settings = (app as any).plugins?.getPlugin('obsidian_plugin_for_todo_flow')?.settings;
        if (settings) {
            this.maxDepth = settings.maxGraphDepth || 5;
        }
    }

    async buildGraph(files: (TFile | string)[]): Promise<TaskNode[]> {
        return Promise.all(files.map(async f => {
            if (typeof f === 'string') {
                const resolved = this.app.vault.getAbstractFileByPath(f);
                if (resolved && (resolved instanceof TFile)) return this.buildNode(resolved, []);
                return this.createMissingNode(f);
            }
            return this.buildNode(f, []);
        }));
    }

    private createMissingNode(path: string): TaskNode {
        const parts = path.split('/');
        const filename = parts[parts.length - 1] || path;
        return {
            id: path,
            title: `[MISSING] ${filename}`,
            duration: 30,
            status: 'todo',
            isAnchored: false,
            children: [],
            isMissing: true
        };
    }

    private async buildNode(file: TFile, visitedPath: string[]): Promise<TaskNode> {
        const depth = visitedPath.length;
        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter || {};
        const status = frontmatter.status || 'todo';

        if (depth >= this.maxDepth) {
            return {
                id: file.path,
                title: file.basename,
                duration: frontmatter.duration || 30,
                isAnchored: !!frontmatter.anchored,
                status: status as 'todo' | 'done',
                children: [],
                isPartial: true
            };
        }

        if (this.logger) this.logger.info(`[GraphBuilder] Reading ${file.path}...`);
        let content = await this.app.vault.read(file);
        if (this.logger) this.logger.info(`[GraphBuilder] Read ${file.path} (${content?.length} chars)`);
        if (typeof content !== 'string') {
            if (this.logger) this.logger.warn(`[GraphBuilder] Non-string content for ${file.path}`);
            content = String(content || '');
        }

        // if (this.logger) this.logger.info(`[GraphBuilder] Read ${file.path} (${content.length} chars)`);
        const firstLine = getFirstNonMetadataLine(content);

        const baseTitle = resolveTaskTitle(frontmatter, firstLine, file.name);
        if (this.logger) this.logger.info(`[GraphBuilder] Resolved title for ${file.path}: "${baseTitle}"`);

        // NLP Enrichment: If frontmatter is missing data, try to extract from title
        const parsed = DateParser.parseTaskInput(baseTitle);

        const node: TaskNode = {
            id: file.path,
            title: parsed.title, // Use cleaned title
            duration: frontmatter.duration || parsed.duration || 30,
            isAnchored: frontmatter.anchored !== undefined ? frontmatter.anchored : parsed.isAnchored,
            status: status,
            children: [],
            startTime: frontmatter.startTime ? moment(frontmatter.startTime) : (parsed.startTime ?? undefined)
        };

        // 1. Pruning: Removed. We MUST traverse children even if done, 
        // to ensure they are available if the task is later unmarked.
        // if (status === 'done') {
        //     return node;
        // }

        // 3. Link Resolution & Cycle Prevention
        const links = this.app.metadataCache.resolvedLinks[file.path] || {};
        const childFiles: TFile[] = [];

        // Prepare the path for the next level
        const newVisited = [...visitedPath, file.path];

        for (const childPath of Object.keys(links)) {
            // Cycle Check: If this child is already in our history, skip it entirely.
            // This prevents A -> B -> A. We want A -> B -> (nothing).
            if (newVisited.includes(childPath)) {
                continue;
            }

            const childFile = this.app.vault.getAbstractFileByPath(childPath);
            if (childFile && (childFile as any).extension === 'md') {
                childFiles.push(childFile as TFile);
            }
        }

        // 4. Recursive Build
        node.children = await Promise.all(childFiles.map(cf => this.buildNode(cf, newVisited)));

        return node;
    }
}
