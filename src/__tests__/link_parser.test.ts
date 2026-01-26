import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LinkParser } from '../parsers/LinkParser.js';
import { type App } from 'obsidian';

describe('LinkParser - Basic Wikilink Parsing', () => {
    let mockApp: any;
    let parser: LinkParser;

    beforeEach(() => {
        // Mock Obsidian App
        mockApp = {
            vault: {
                adapter: {
                    read: vi.fn(),
                    exists: vi.fn()
                },
                getAbstractFileByPath: vi.fn()
            },
            metadataCache: {
                getFirstLinkpathDest: vi.fn()
            }
        };
        parser = new LinkParser(mockApp as App);
    });

    it('should parse file with simple wikilinks', async () => {
        // Arrange: Mock file content with basic wikilinks
        const fileContent = `# Parent Task

This is a task with children:
- [[Child A]]
- [[Child B]]
- [[Child C]]
`;
        // Mock the linked files to return their filenames as content
        mockApp.vault.adapter.read.mockImplementation((path: string) => {
            if (path === 'parent.md') return Promise.resolve(fileContent);
            // For child files, return empty content (will use filename)
            return Promise.resolve('');
        });
        mockApp.vault.adapter.exists.mockResolvedValue(true);

        // Act: Parse the file
        const tasks = await parser.parse('parent.md');

        // Assert: Should extract 3 child tasks with filenames as titles
        expect(tasks).toHaveLength(3);
        expect(tasks[0]!.id).toBe('Child A.md');
        expect(tasks[0]!.title).toBe('Child A'); // Filename without .md
        expect(tasks[1]!.id).toBe('Child B.md');
        expect(tasks[1]!.title).toBe('Child B');
        expect(tasks[2]!.id).toBe('Child C.md');
        expect(tasks[2]!.title).toBe('Child C');
    });

    it('should handle file with no links', async () => {
        // Arrange: Mock file with no wikilinks
        const fileContent = `# Simple Task

Just a regular task with no children.
`;
        mockApp.vault.adapter.read.mockResolvedValue(fileContent);

        // Act
        const tasks = await parser.parse('simple.md');

        // Assert: Should return empty array
        expect(tasks).toHaveLength(0);
    });

    it('should ignore non-wikilink brackets', async () => {
        // Arrange: Mock file with code blocks and other brackets
        const fileContent = `# Task

Some code: \`const arr = [1, 2, 3]\`
A real link: [[Actual Task]]
`;
        mockApp.vault.adapter.read.mockResolvedValue(fileContent);

        // Act
        const tasks = await parser.parse('task.md');

        // Assert: Should only extract the real wikilink
        expect(tasks).toHaveLength(1);
        expect(tasks[0]!.title).toBe('Actual Task');
    });
});
