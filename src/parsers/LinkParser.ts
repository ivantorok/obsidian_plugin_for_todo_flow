import { type App } from 'obsidian';
import { type TaskNode } from '../scheduler.js';
import { resolveTaskTitle, getFirstNonMetadataLine } from '../utils/title-resolver.js';

/**
 * LinkParser - Parses markdown files with [[wikilinks]] into TaskNode arrays
 * 
 * Supports:
 * - Basic wikilinks: [[Example]]
 * - Custom display text: [[Example|Custom name]]
 * - Markdown links: [Custom](Example.md)
 * 
 * Task name resolution hierarchy:
 * 1. Frontmatter metadata (task: field)
 * 2. First line of file content
 * 3. Filename (stripped of Zettel prefixes)
 */
export interface TaskSource {
    parse(filePath: string): Promise<TaskNode[]>;
}

export class LinkParser implements TaskSource {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    async parse(filePath: string): Promise<TaskNode[]> {
        // Read file content
        const content = await this.app.vault.adapter.read(filePath);

        // Extract all wikilinks
        const links = this.extractWikilinks(content);

        // Convert to TaskNodes with resolved metadata
        const tasks: TaskNode[] = await Promise.all(
            links.map(async link => {
                // Resolve the link to a specific file in the vault
                const file = this.app.metadataCache.getFirstLinkpathDest(link.path, filePath);
                const resolvedPath = file ? file.path : (link.path.endsWith('.md') ? link.path : `${link.path}.md`);

                // Resolve metadata from the linked file
                const metadata = await this.resolveTaskMetadata(resolvedPath);

                return {
                    id: resolvedPath,
                    // Use custom display text if provided, otherwise resolved title
                    title: link.displayText || metadata.title,
                    duration: metadata.duration ?? 30,
                    status: (metadata.status as 'todo' | 'done') ?? 'todo',
                    isAnchored: metadata.isAnchored ?? false,
                    children: []
                };
            })
        );

        return tasks;
    }

    /**
     * Resolve task metadata using hierarchy:
     * 1. Read file if it exists
     * 2. Extract title, duration, status, isAnchored
     */
    public async resolveTaskMetadata(filePath: string): Promise<{
        title: string;
        duration?: number;
        status?: string;
        isAnchored?: boolean;
    }> {
        try {
            // Default title is filename
            const defaultTitle = this.getFilenameWithoutExtension(filePath);

            // Check if file exists
            const exists = await this.app.vault.adapter.exists(filePath);
            if (!exists) {
                return { title: defaultTitle };
            }

            // Read file content
            const content = await this.app.vault.adapter.read(filePath);

            // Parse frontmatter
            const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
            const match = content.match(frontmatterRegex);
            let metadata: any = {};

            if (match && match[1]) {
                metadata = this.parseFrontmatter(match[1]);
            }

            // Resolve title using new global hierarchy
            const firstLine = getFirstNonMetadataLine(content);
            const title = resolveTaskTitle(metadata, firstLine, filePath.split('/').pop() || filePath);

            return {
                title,
                duration: metadata.duration,
                status: metadata.status,
                isAnchored: metadata.anchored // We use 'anchored' in frontmatter
            };
        } catch (error) {
            return { title: this.getFilenameWithoutExtension(filePath) };
        }
    }

    /**
     * Extract wikilinks from markdown content
     * Matches: [[Example]] and [[Example|Display Text]]
     */
    private extractWikilinks(content: string): Array<{ path: string; displayText?: string }> {
        const links: Array<{ path: string; displayText?: string }> = [];

        // Regex to match [[link]] or [[link|display]]
        // Negative lookbehind/lookahead to avoid code blocks
        const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

        let match;
        while ((match = wikilinkRegex.exec(content)) !== null) {
            const path = match[1]?.trim();
            const displayText = match[2]?.trim();

            if (!path) continue; // Skip if path is undefined

            links.push({
                path,
                ...(displayText && { displayText }) // Only add displayText if it exists
            });
        }

        return links;
    }

    /**
     * Extract markdown links from content
     * Matches: [Display](Example.md)
     */
    private extractMarkdownLinks(content: string): Array<{ path: string; displayText?: string }> {
        // TODO: Implement
        return [];
    }

    /**
     * Extract first markdown heading
     * @deprecated Use resolveTaskTitle with getFirstNonMetadataLine instead
     */
    private extractFirstHeading(content: string): string | null {
        // Match first # heading (not inside code blocks)
        const headingRegex = /^#\s+(.+)$/m;
        const match = content.match(headingRegex);

        return (match && match[1]) ? match[1].trim() : null;
    }

    /**
     * Get filename without .md extension
     */
    private getFilenameWithoutExtension(filePath: string): string {
        const filename = filePath.split('/').pop() || filePath;
        return filename.replace(/\.md$/, '');
    }

    /**
     * Update task metadata in a file while preserving existing frontmatter
     */
    async updateTaskMetadata(filePath: string, metadata: Partial<{
        duration: number;
        status: string;
        isAnchored: boolean;
        startTime?: string;
    }>): Promise<void> {
        try {
            // Check if file exists
            const exists = await this.app.vault.adapter.exists(filePath);
            let content = '';

            if (exists) {
                content = await this.app.vault.adapter.read(filePath);
            }

            // Update or create frontmatter
            const updatedContent = this.updateFrontmatter(content, metadata);

            // Write back to file
            await this.app.vault.adapter.write(filePath, updatedContent);
        } catch (error) {
            console.error(`Failed to update metadata for ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Update frontmatter in content, preserving existing fields
     */
    private updateFrontmatter(content: string, metadata: Record<string, any>): string {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\n?/;
        const match = content.match(frontmatterRegex);

        let existingFields: Record<string, any> = {};
        let restOfContent = content;

        if (match && match[1]) {
            // Parse existing frontmatter
            const frontmatterText = match[1];
            existingFields = this.parseFrontmatter(frontmatterText);
            restOfContent = content.substring(match[0].length);
        }

        // Merge metadata (our fields override)
        const mergedFields = {
            ...existingFields,
            ...this.convertMetadataToFrontmatter(metadata)
        };

        // Serialize back to YAML
        const frontmatterText = this.serializeFrontmatter(mergedFields);

        return `---\n${frontmatterText}---\n${restOfContent}`;
    }

    /**
     * Parse YAML frontmatter into object
     */
    private parseFrontmatter(frontmatterText: string): Record<string, any> {
        const fields: Record<string, any> = {};
        const lines = frontmatterText.split('\n');

        for (const line of lines) {
            const match = line.match(/^(\w+):\s*(.+)$/);
            if (match && match[1] && match[2]) {
                const key = match[1];
                let value: any = match[2];

                // Try to parse as JSON for arrays/objects
                if (value.startsWith('[') || value.startsWith('{')) {
                    try {
                        value = JSON.parse(value);
                    } catch {
                        // Keep as string if not valid JSON
                    }
                } else if (value === 'true') {
                    value = true;
                } else if (value === 'false') {
                    value = false;
                } else if (!isNaN(Number(value))) {
                    value = Number(value);
                }

                fields[key] = value;
            }
        }

        return fields;
    }

    /**
     * Serialize frontmatter object to YAML
     */
    private serializeFrontmatter(fields: Record<string, any>): string {
        const lines: string[] = [];

        for (const [key, value] of Object.entries(fields)) {
            if (value === undefined) continue;

            let serialized: string;
            if (typeof value === 'object') {
                serialized = JSON.stringify(value);
            } else {
                serialized = String(value);
            }

            lines.push(`${key}: ${serialized}`);
        }

        return lines.join('\n') + '\n';
    }

    /**
     * Convert our metadata format to frontmatter field names
     */
    private convertMetadataToFrontmatter(metadata: Record<string, any>): Record<string, any> {
        const frontmatter: Record<string, any> = {};

        if (metadata.duration !== undefined) {
            frontmatter.duration = metadata.duration;
        }
        if (metadata.status !== undefined) {
            frontmatter.status = metadata.status;
        }
        if (metadata.isAnchored !== undefined) {
            frontmatter.anchored = metadata.isAnchored;
        }
        if (metadata.startTime !== undefined) {
            frontmatter.startTime = metadata.startTime;
        }

        return frontmatter;
    }
}
