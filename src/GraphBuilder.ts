import { App, TFile } from 'obsidian';
import { type TaskNode } from './scheduler.js';
import { resolveTaskTitle, getFirstNonMetadataLine } from './utils/title-resolver.js';
import { DateParser } from './utils/DateParser.js';
import { ProcessGovernor } from './services/ProcessGovernor.js';
import moment from 'moment';

export class GraphBuilder {
    private maxDepth: number = 5;

    constructor(private app: App, private logger?: any) {
        // Access settings via plugin if possible, or use a default
        // For now, let's assume we can pass it or get it from app
        const plugin = (app as any).plugins?.getPlugin('obsidian_plugin_for_todo_flow');
        const settings = plugin?.settings;
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

        const governor = ProcessGovernor.getInstance(this.app);
        let effectiveMaxDepth = this.maxDepth;

        if (governor.isCriticalPressure()) {
            effectiveMaxDepth = Math.max(1, Math.floor(this.maxDepth / 2));
            if (this.logger) this.logger.warn(`[GraphBuilder] CRITICAL PRESSURE: Throttling maxDepth to ${effectiveMaxDepth}`);
        } else if (governor.isHighPressure()) {
            effectiveMaxDepth = Math.max(1, this.maxDepth - 1);
            if (this.logger) this.logger.info(`[GraphBuilder] HIGH PRESSURE: Throttling maxDepth to ${effectiveMaxDepth}`);
        }

        if (depth >= effectiveMaxDepth) {
            return {
                id: file.path,
                title: file.basename,
                duration: frontmatter.duration || 30,
                isAnchored: !!frontmatter.anchored,
                status: status as 'todo' | 'done',
                children: [],
                isPartial: true,
                _loadedAt: Date.now()
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
            originalDuration: frontmatter.originalDuration || (frontmatter.duration || parsed.duration || 30),
            isAnchored: frontmatter.anchored !== undefined ? frontmatter.anchored : parsed.isAnchored,
            status: status,
            children: [],
            startTime: frontmatter.startTime ? moment(frontmatter.startTime) : (parsed.startTime ?? undefined),
            _loadedAt: Date.now()
        };

        // 1. Pruning: Removed. We MUST traverse children even if done, 
        // to ensure they are available if the task is later unmarked.
        // if (status === 'done') {
        //     return node;
        // }

        // 3. Link Resolution & Cycle Prevention
        const links = this.app.metadataCache.resolvedLinks[file.path] || {};
        const extractedLinks = this.extractLinks(content);

        // Merge the async cache results with our synchronous regex extraction
        // to ensure we never miss a newly inserted subtask link.
        const childPathsToVisit = new Set([...Object.keys(links), ...extractedLinks]);

        const childFiles: TFile[] = [];

        // Prepare the path for the next level
        const newVisited = [...visitedPath, file.path];

        for (const childPath of childPathsToVisit) {
            // Cycle Check: If this child is already in our history, skip it entirely.
            // This prevents A -> B -> A. We want A -> B -> (nothing).
            if (newVisited.includes(childPath)) {
                continue;
            }

            // Fallback for extracted links: they might lack the .md extension or path
            const resolvedFile = this.app.metadataCache.getFirstLinkpathDest(childPath, file.path);
            const finalPath = resolvedFile ? resolvedFile.path : (childPath.endsWith('.md') ? childPath : `${childPath}.md`);

            let childFile = this.app.vault.getAbstractFileByPath(finalPath);

            // If getAbstractFileByPath fails but we extracted it from the file,
            // Obsidian might not have indexed it yet. We'll let recursive buildHandle missing nodes.
            if (childFile && (childFile as any).extension === 'md') {
                childFiles.push(childFile as TFile);
            } else if (extractedLinks.includes(childPath)) {
                // It's a newly extracted link that Obsidian doesn't know about yet.
                // We add it as a string to let `buildGraph` handle it as a missing/pending node.
                childFiles.push(finalPath as any);
            }
        }

        // 4. Recursive Build
        node.children = await Promise.all(childFiles.map(cf => {
            if (typeof cf === 'string') {
                // If we forced an extracted string path in because the TFile isn't indexed yet,
                // try to fetch it one last time, else build a missing node.
                const fallbackFile = this.app.vault.getAbstractFileByPath(cf);
                if (fallbackFile && fallbackFile instanceof TFile) {
                    return this.buildNode(fallbackFile, newVisited);
                }
                return Promise.resolve(this.createMissingNode(cf));
            }
            return this.buildNode(cf, newVisited);
        }));

        return node;
    }

    /**
     * Synchronously extract outbound wikilinks from Markdown content.
     * Use case: Bypassing the Obsidian async metadataCache when we need 
     * guaranteed real-time state immediately after a file write.
     */
    private extractLinks(content: string): string[] {
        const links: string[] = [];
        const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
        let match;
        while ((match = wikilinkRegex.exec(content)) !== null) {
            const path = match[1]?.trim();
            if (path) {
                links.push(path);
            }
        }
        return links;
    }
}
