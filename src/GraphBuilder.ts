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
                if (resolved && (resolved as any).extension === 'md') return this.buildNode(resolved as any, []);
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
        const log = (msg: string) => {
            if (typeof window !== 'undefined') {
                (window as any)._tf_log = (window as any)._tf_log || [];
                (window as any)._tf_log.push(`[GraphBuilder] ${msg}`);
                console.log(`[GraphBuilder] ${msg}`);
            }
        };
        const depth = visitedPath.length;
        log(`buildNode(${file.path}, depth=${depth}) entry`);
        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter || {};
        const status = frontmatter.status || 'todo';

        const governor = ProcessGovernor.getInstance(this.app);
        let effectiveMaxDepth = this.maxDepth;

        if (governor.isCriticalPressure()) {
            effectiveMaxDepth = Math.max(1, Math.floor(this.maxDepth / 2));
            if (this.logger) this.logger.warn(`[GraphBuilder] CRITICAL PRESSURE: Throttling maxDepth to ${effectiveMaxDepth}`);
            log(`CRITICAL PRESSURE: Throttling maxDepth to ${effectiveMaxDepth}`);
        } else if (governor.isHighPressure()) {
            effectiveMaxDepth = Math.max(1, this.maxDepth - 1);
            if (this.logger) this.logger.info(`[GraphBuilder] HIGH PRESSURE: Throttling maxDepth to ${effectiveMaxDepth}`);
            log(`HIGH PRESSURE: Throttling maxDepth to ${effectiveMaxDepth}`);
        }

        if (depth >= effectiveMaxDepth) {
            log(`Max depth reached at ${file.path} (depth=${depth}, limit=${effectiveMaxDepth})`);
            return {
                id: file.path,
                title: file.basename,
                duration: frontmatter.duration ?? 30,
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

        // Synchronous Frontmatter Extraction (Fidelity Guard)
        let syncStatus = status;
        let syncDuration = frontmatter.duration;
        let syncOriginalDuration = frontmatter.originalDuration;
        let syncAnchored = frontmatter.anchored;
        let syncStartTime = frontmatter.startTime;

        if (content.startsWith('---')) {
            const endIdx = content.indexOf('\n---', 3);
            if (endIdx !== -1) {
                const fmStr = content.substring(3, endIdx);
                const lines = fmStr.split('\n');
                for (const line of lines) {
                    const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
                    if (match) {
                        const key = match[1]!.trim();
                        const val = match[2]!.trim();
                        if (key === 'status') syncStatus = val;
                        if (key === 'duration') syncDuration = parseInt(val, 10);
                        if (key === 'originalDuration') syncOriginalDuration = parseInt(val, 10);
                        if (key === 'anchored') syncAnchored = val === 'true';
                        if (key === 'startTime') syncStartTime = val;
                    }
                }
            }
        }

        // NLP Enrichment: If frontmatter is missing data, try to extract from title
        const parsed = DateParser.parseTaskInput(baseTitle);

        const node: TaskNode = {
            id: file.path,
            title: parsed.title, // Use cleaned title
            duration: syncDuration ?? parsed.duration ?? 30,
            originalDuration: syncOriginalDuration ?? syncDuration ?? parsed.duration, // No system default for overhead
            isAnchored: syncAnchored !== undefined ? syncAnchored : parsed.isAnchored,
            status: syncStatus as 'todo' | 'done',
            children: [],
            startTime: syncStartTime ? moment(syncStartTime) : (parsed.startTime ?? undefined),
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

        // Merge and Normalize
        const normalizedPaths = new Set<string>();
        for (const rawPath of [...Object.keys(links), ...extractedLinks]) {
            let resolvedTFile = this.app.metadataCache.getFirstLinkpathDest(rawPath, file.path);
            let finalPath = resolvedTFile ? resolvedTFile.path : (rawPath.endsWith('.md') ? rawPath : `${rawPath}.md`);

            // Fallback for newly created tasks (metadataCache is async and may not have it yet)
            if (!resolvedTFile) {
                const plugin = (this.app as any).plugins?.getPlugin('obsidian_plugin_for_todo_flow');
                const targetFolder = plugin?.settings?.targetFolder || '';
                if (targetFolder) {
                    const fallbackPath = `${targetFolder}/${rawPath.endsWith('.md') ? rawPath : rawPath + '.md'}`.replace(/\/\//g, '/');
                    if (this.app.vault.getAbstractFileByPath(fallbackPath)) {
                        finalPath = fallbackPath;
                    }
                }
            }

            normalizedPaths.add(finalPath);
        }

        if (this.logger) this.logger.info(`[GraphBuilder] ${file.path} has ${normalizedPaths.size} distinct child links to visit.`);

        const childFiles: TFile[] = [];
        const newVisited = [...visitedPath, file.path];

        for (const childPath of normalizedPaths) {
            if (newVisited.includes(childPath)) {
                continue;
            }

            let resolvedTFile = this.app.metadataCache.getFirstLinkpathDest(childPath, file.path);
            let finalPath = resolvedTFile ? resolvedTFile.path : (childPath.endsWith('.md') ? childPath : `${childPath}.md`);
            let childFile = resolvedTFile || this.app.vault.getAbstractFileByPath(finalPath);

            // If getAbstractFileByPath fails but we extracted it from the file,
            // Obsidian might not have indexed it yet. We'll let recursive build handle missing nodes.
            const ext = (childFile as any)?.extension;
            if (childFile && (ext === 'md' || finalPath.endsWith('.md'))) {
                childFiles.push(childFile as TFile);
            } else if (extractedLinks.includes(childPath) || extractedLinks.some(l => `${l}.md` === childPath || childPath.endsWith(`/${l}.md`))) {
                // It's a newly extracted link that Obsidian doesn't know about yet.
                // We add it as a string to let `buildGraph` handle it as a missing/pending node.
                childFiles.push(finalPath as any);
            }
        }
        log(`Found ${childFiles.length} child candidates for ${file.path}`);

        // 4. Recursive Build
        node.children = await Promise.all(childFiles.map(cf => {
            if (typeof cf === 'string') {
                // If we forced an extracted string path in because the TFile isn't indexed yet,
                // try to fetch it one last time, else build a missing node.
                const fallbackFile = this.app.metadataCache.getFirstLinkpathDest(cf, '');
                const finalFallback = fallbackFile || this.app.vault.getAbstractFileByPath(cf);
                if (finalFallback && (finalFallback as any).extension === 'md') {
                    return this.buildNode(finalFallback as any, newVisited);
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
