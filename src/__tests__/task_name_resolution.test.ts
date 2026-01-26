import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LinkParser } from '../parsers/LinkParser.js';
import { type App } from 'obsidian';

describe('LinkParser - Task Name Resolution', () => {
    let mockApp: any;
    let parser: LinkParser;

    beforeEach(() => {
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

    it('should use frontmatter "task" field as task name (priority 1)', async () => {
        // Arrange: File with frontmatter 'task'
        const parentContent = `# Parent\n- [[child-with-metadata]]\n`;
        const childContent = `---\ntask: Custom Task Name\n---\n\n# Some Heading\n\nContent here.\n`;

        mockApp.vault.adapter.read.mockImplementation((path: string) => {
            if (path === 'parent.md') return Promise.resolve(parentContent);
            if (path === 'child-with-metadata.md') return Promise.resolve(childContent);
            return Promise.reject(new Error('File not found'));
        });
        mockApp.vault.adapter.exists.mockResolvedValue(true);

        // Act
        const tasks = await parser.parse('parent.md');

        // Assert: Should use frontmatter task
        expect(tasks).toHaveLength(1);
        expect(tasks[0]!.title).toBe('Custom Task Name');
    });

    it('should use first line as task name (priority 2)', async () => {
        // Arrange: File with no task field, but a first line
        const parentContent = `# Parent\n- [[child-with-content]]\n`;
        const childContent = `This is the first line\n\nSome more content.\n`;

        mockApp.vault.adapter.read.mockImplementation((path: string) => {
            if (path === 'parent.md') return Promise.resolve(parentContent);
            if (path === 'child-with-content.md') return Promise.resolve(childContent);
            return Promise.reject(new Error('File not found'));
        });
        mockApp.vault.adapter.exists.mockResolvedValue(true);

        // Act
        const tasks = await parser.parse('parent.md');

        // Assert: Should use first line
        expect(tasks).toHaveLength(1);
        expect(tasks[0]!.title).toBe('This is the first line');
    });

    it('should strip markdown headers from first line', async () => {
        // Arrange: File with first line as heading
        const parentContent = `# Parent\n- [[child-with-heading]]\n`;
        const childContent = `# Task From Heading\n\nContent without frontmatter.\n`;

        mockApp.vault.adapter.read.mockImplementation((path: string) => {
            if (path === 'parent.md') return Promise.resolve(parentContent);
            if (path === 'child-with-heading.md') return Promise.resolve(childContent);
            return Promise.reject(new Error('File not found'));
        });
        mockApp.vault.adapter.exists.mockResolvedValue(true);

        // Act
        const tasks = await parser.parse('parent.md');

        // Assert: Should use heading text
        expect(tasks[0]!.title).toBe('Task From Heading');
    });

    it('should use filename as task name (priority 3) if content is empty', async () => {
        // Arrange: File with no content
        const parentContent = `# Parent\n- [[plain-file]]\n`;
        const childContent = `   \n\n   `;

        mockApp.vault.adapter.read.mockImplementation((path: string) => {
            if (path === 'parent.md') return Promise.resolve(parentContent);
            if (path === 'plain-file.md') return Promise.resolve(childContent);
            return Promise.reject(new Error('File not found'));
        });
        mockApp.vault.adapter.exists.mockResolvedValue(true);

        // Act
        const tasks = await parser.parse('parent.md');

        // Assert: Should use filename
        expect(tasks).toHaveLength(1);
        expect(tasks[0]!.title).toBe('plain-file');
    });

    it('should respect custom link text over resolved name', async () => {
        // Arrange: Link with custom display text
        const parentContent = `# Parent\n- [[child-file|Override Name]]\n`;
        const childContent = `---\ntask: Metadata Title\n---\n`;

        mockApp.vault.adapter.read.mockImplementation((path: string) => {
            if (path === 'parent.md') return Promise.resolve(parentContent);
            if (path === 'child-file.md') return Promise.resolve(childContent);
            return Promise.reject(new Error('File not found'));
        });
        mockApp.vault.adapter.exists.mockResolvedValue(true);

        // Act
        const tasks = await parser.parse('parent.md');

        // Assert: Custom link text should override everything
        expect(tasks).toHaveLength(1);
        expect(tasks[0]!.title).toBe('Override Name');
    });
});
