import { type App, type TFile } from 'obsidian';
import { type TaskNode } from './scheduler.js';
import { resolveTaskTitle, getFirstNonMetadataLine } from './utils/title-resolver.js';
import { DateParser } from './utils/DateParser.js';
import moment from 'moment';

export class GraphBuilder {
    constructor(private app: App) { }

    async buildGraph(files: TFile[]): Promise<TaskNode[]> {
        // We only want to process files that are passed in as "roots" or found in the folder.
        // But for a graph, we need to resolve children even if they are NOT in the initial file list?
        // The requirements say: "Uses files in one specific folder".
        // But "Whenever a file is linked, the we consider it as a sub task." 
        // This usually implies following links even outside the folder, OR just within.
        // Let's assume we follow links to any valid file in the vault to be safe/powerful.

        return Promise.all(files.map(file => this.buildNode(file, [])));
    }

    private async buildNode(file: TFile, visitedPath: string[]): Promise<TaskNode> {
        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter || {};
        const status = frontmatter.status || 'todo';

        const content = await this.app.vault.read(file);
        const firstLine = getFirstNonMetadataLine(content);

        const baseTitle = resolveTaskTitle(frontmatter, firstLine, file.name);

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

        // 1. Pruning: If status is done, we do NOT traverse children.
        if (status === 'done') {
            return node;
        }

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
