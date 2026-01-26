import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LinkParser } from '../parsers/LinkParser.js';
import { type App } from 'obsidian';

describe('LinkParser - Metadata Preservation', () => {
    let mockApp: any;
    let parser: LinkParser;
    let writtenContent: Map<string, string>;

    beforeEach(() => {
        writtenContent = new Map();

        mockApp = {
            vault: {
                adapter: {
                    read: vi.fn(),
                    write: vi.fn((path: string, content: string) => {
                        writtenContent.set(path, content);
                        return Promise.resolve();
                    }),
                    exists: vi.fn()
                },
                getAbstractFileByPath: vi.fn()
            }
        };
        parser = new LinkParser(mockApp as App);
    });

    it('should preserve existing frontmatter when updating task metadata', async () => {
        // Arrange: File with existing frontmatter
        const existingContent = `---
title: My Task
author: John Doe
tags: [work, important]
customField: someValue
---

# Task Content

Some task description.
`;

        mockApp.vault.adapter.read.mockResolvedValue(existingContent);
        mockApp.vault.adapter.exists.mockResolvedValue(true);

        // Act: Update task metadata (e.g., set duration, status)
        await parser.updateTaskMetadata('task.md', {
            duration: 45,
            status: 'in-progress',
            isAnchored: true
        });

        // Assert: Should preserve existing fields and add our fields
        const written = writtenContent.get('task.md');
        expect(written).toBeDefined();
        expect(written).toContain('author: John Doe');
        expect(written).toContain('tags: [work, important]');
        expect(written).toContain('customField: someValue');
        expect(written).toContain('duration: 45');
        expect(written).toContain('status: in-progress');
        expect(written).toContain('anchored: true');
    });

    it('should update our metadata without touching other fields', async () => {
        // Arrange: File with our metadata already present
        const existingContent = `---
title: My Task
duration: 30
status: todo
anchored: false
author: John Doe
---

Content here.
`;

        mockApp.vault.adapter.read.mockResolvedValue(existingContent);
        mockApp.vault.adapter.exists.mockResolvedValue(true);

        // Act: Update only duration
        await parser.updateTaskMetadata('task.md', {
            duration: 60
        });

        // Assert: Should update duration, keep everything else
        const written = writtenContent.get('task.md');
        expect(written).toBeDefined();
        expect(written).toContain('duration: 60');
        expect(written).toContain('status: todo'); // Unchanged
        expect(written).toContain('anchored: false'); // Unchanged
        expect(written).toContain('author: John Doe'); // Preserved
    });

    it('should create frontmatter if file has none', async () => {
        // Arrange: File without frontmatter
        const existingContent = `# Simple Task

Just content, no metadata.
`;

        mockApp.vault.adapter.read.mockResolvedValue(existingContent);
        mockApp.vault.adapter.exists.mockResolvedValue(true);

        // Act: Add metadata
        await parser.updateTaskMetadata('task.md', {
            duration: 30,
            status: 'todo'
        });

        // Assert: Should create frontmatter block
        const written = writtenContent.get('task.md');
        expect(written).toBeDefined();
        expect(written).toMatch(/^---\n/);
        expect(written).toContain('duration: 30');
        expect(written).toContain('status: todo');
        expect(written).toContain('# Simple Task'); // Preserve content
    });

    it('should handle non-existent files gracefully', async () => {
        // Arrange: File doesn't exist
        mockApp.vault.adapter.exists.mockResolvedValue(false);

        // Act: Try to update metadata
        await parser.updateTaskMetadata('nonexistent.md', {
            duration: 30
        });

        // Assert: Should create new file with frontmatter
        const written = writtenContent.get('nonexistent.md');
        expect(written).toBeDefined();
        expect(written).toContain('duration: 30');
    });
});
