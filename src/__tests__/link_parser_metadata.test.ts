import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LinkParser } from '../parsers/LinkParser.js';
import { type App } from 'obsidian';

describe('LinkParser - Metadata Resolution', () => {
    let mockApp: any;
    let parser: LinkParser;

    beforeEach(() => {
        mockApp = {
            vault: {
                adapter: {
                    read: vi.fn(),
                    exists: vi.fn()
                }
            },
            metadataCache: {
                getFirstLinkpathDest: vi.fn()
            }
        };
        parser = new LinkParser(mockApp as App);
    });

    it('should resolve duration, status, and anchored from linked file frontmatter', async () => {
        const parentContent = '[[child.md]]';
        const childContent = `---
duration: 45
status: done
anchored: true
---
# Child Task`;

        mockApp.vault.adapter.read.mockImplementation((path: string) => {
            if (path === 'parent.md') return Promise.resolve(parentContent);
            if (path === 'child.md') return Promise.resolve(childContent);
            return Promise.resolve('');
        });
        mockApp.vault.adapter.exists.mockResolvedValue(true);

        const tasks = await parser.parse('parent.md');

        expect(tasks).toHaveLength(1);
        expect(tasks[0]!.id).toBe('child.md');
        expect(tasks[0]!.duration).toBe(45);
        expect(tasks[0]!.status).toBe('done');
        expect(tasks[0]!.isAnchored).toBe(true);
    });

    it('should use default values if frontmatter is missing fields', async () => {
        const parentContent = '[[child.md]]';
        const childContent = `---
status: todo
---
# Child Task`;

        mockApp.vault.adapter.read.mockImplementation((path: string) => {
            if (path === 'parent.md') return Promise.resolve(parentContent);
            if (path === 'child.md') return Promise.resolve(childContent);
            return Promise.resolve('');
        });
        mockApp.vault.adapter.exists.mockResolvedValue(true);

        const tasks = await parser.parse('parent.md');

        expect(tasks).toHaveLength(1);
        expect(tasks[0]!.duration).toBe(30); // Default
        expect(tasks[0]!.status).toBe('todo');
        expect(tasks[0]!.isAnchored).toBe(false); // Default
    });
});
