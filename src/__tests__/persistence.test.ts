import { describe, it, expect } from 'vitest';
import { updateMetadataField, parseTitleFromFilename } from '../persistence.js';

describe('Metadata Persistence', () => {
    it('should update an existing status field in YAML frontmatter', () => {
        const content = `---
status: todo
duration: 30
---
# Task Title`;
        const updated = updateMetadataField(content, 'status', 'done');
        expect(updated).toContain('status: done');
        expect(updated).toContain('duration: 30');
    });

    it('should add frontmatter if it is missing', () => {
        const content = `# Task Title
No frontmatter here.`;
        const updated = updateMetadataField(content, 'status', 'done');
        expect(updated).toMatch(/^---/);
        expect(updated).toContain('status: done');
        expect(updated).toContain('---\n# Task Title');
    });

    it('should add a field to existing frontmatter if it is missing', () => {
        const content = `---
duration: 30
---
# Task Title`;
        const updated = updateMetadataField(content, 'status', 'done');
        expect(updated).toContain('status: done');
        expect(updated).toContain('duration: 30');
    });

    it('should not disturb the rest of the note content', () => {
        const content = `---
status: todo
---
# My Content
Some other text.`;
        const updated = updateMetadataField(content, 'status', 'done');
        expect(updated).toContain('# My Content\nSome other text.');
    });
});

describe('Filename Parsing', () => {
    it('should extract the clean title from a filename following the convention', () => {
        const filename = '2026-01-25-0822-50tz-wearwaerf';
        expect(parseTitleFromFilename(filename)).toBe('wearwaerf');
    });

    it('should handle multiple dashes in the title', () => {
        const filename = '2026-01-25-0822-abcd-my-cool-task';
        expect(parseTitleFromFilename(filename)).toBe('my-cool-task');
    });

    it('should return the original name if it does not match the pattern', () => {
        const filename = 'Simple Task';
        expect(parseTitleFromFilename(filename)).toBe('Simple Task');
    });
});
