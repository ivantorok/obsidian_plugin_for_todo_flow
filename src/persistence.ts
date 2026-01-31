import moment from 'moment';

/**
 * Safely updates a field in the YAML frontmatter of a markdown string.
 * If frontmatter doesn't exist, it creates it.
 */
export function updateMetadataField(content: string, field: string, value: string | number | boolean): string {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
    const match = content.match(frontmatterRegex);

    if (match) {
        // Frontmatter exists
        let frontmatter = match[1] ?? '';
        const body = content.slice(match[0].length);
        const lines = frontmatter.split('\n');
        let fieldUpdated = false;

        const updatedLines = lines.map(line => {
            const parts = line.split(':');
            const k = parts[0] ? parts[0].trim() : '';
            if (k === field) {
                fieldUpdated = true;
                return `${field}: ${value}`;
            }
            return line;
        });

        if (!fieldUpdated) {
            updatedLines.push(`${field}: ${value}`);
        }

        return `---
${updatedLines.join('\n').trim()}
---${body}`;
    } else {
        // No frontmatter
        return `---
${field}: ${value}
---
${content}`;
    }
}

export function generateFilename(title: string): string {
    const timestamp = moment().format("YYYY-MM-DD-HHmm");
    const randomID = Math.random().toString(36).substring(2, 6).padEnd(4, '0');
    const normalizedTitle = title.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-');
    const sanitizedTitle = normalizedTitle.replace(/-+/g, '-');
    return `${timestamp}-${randomID}-${sanitizedTitle}.md`;
}

/**
 * Extracts the "clean" title from a filename following the [YYYY-MM-DD-HHmm]-[ID]-[Title] convention.
 * Returns the original basename if it doesn't match the pattern.
 */
export function parseTitleFromFilename(basename: string): string {
    // Pattern: 2026-01-25-0822 (15) - abcd (4) - title...
    const conventionRegex = /^\d{4}-\d{2}-\d{2}-\d{4}-[a-z0-9]{4}-(.+)$/;
    const match = basename.match(conventionRegex);

    if (match && match[1]) {
        return match[1];
    }

    return basename;
}

// --- Persistence Phase 1: Serialization & Parsing ---

import { type TaskNode } from './scheduler.js';
import { MetadataCache } from 'obsidian';

export function serializeStackToMarkdown(tasks: TaskNode[], options?: { wrapped?: boolean }): string {
    const dateStr = moment().format('YYYY-MM-DD');
    let content = `## Daily Stack - ${dateStr}\n\n`;

    tasks.forEach(task => {
        const timeStr = task.startTime ? task.startTime.format("HH:mm") : '00:00';
        // Use ID as the link target. Format: [[ID|Title]]
        // This hides the ugly path/ID and shows the title as the link text.
        const link = `[[${task.id}|${task.title}]]`;
        content += `- [ ] ${timeStr} ${link} (${task.duration}m)\n`;
    });

    if (options?.wrapped) {
        return `<!-- TODO_FLOW_STACK_START -->\n${content}<!-- TODO_FLOW_STACK_END -->`;
    }

    return content;
}

export function parseMarkdownToStack(content: string): Partial<TaskNode>[] {
    const lines = content.split('\n');
    const tasks: Partial<TaskNode>[] = [];

    // Regex matches: - [ ] 09:15 [[LinkID|Title Text]] (45m)
    // Group 1: Time
    // Group 2: Link/ID
    // Group 3: Title
    // Group 4: Duration
    const taskRegex = /-\s*\[\s*\]\s*(\d{2}:\d{2})\s*\[\[(.+?)\|(.+?)\]\]\s*\((\d+)m\)/;

    lines.forEach(line => {
        const match = line.match(taskRegex);
        if (match) {
            const timeStr = match[1] || '00:00';
            const linkId = match[2] || 'unknown';
            const title = match[3] || 'Untitled';
            const duration = parseInt(match[4] || '30');

            tasks.push({
                id: linkId, // In this simple parser, we use the link as ID
                title: title,
                startTime: moment(timeStr, 'HH:mm'),
                duration: duration,
                status: 'todo',
                isAnchored: false,
                children: []
            });
        }
    });

    return tasks;
}

export function collectTasksFromLinks(cache: MetadataCache, filePath: string): string[] {
    const fileCache = cache.getCache(filePath);
    if (!fileCache || !fileCache.links) return [];

    return fileCache.links.map(link => link.link);
}
