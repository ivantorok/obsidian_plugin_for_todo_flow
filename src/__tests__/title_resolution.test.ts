import { describe, it, expect } from 'vitest';
import { resolveTaskTitle } from '../utils/title-resolver.js';

describe('Task Title Resolution Hierarchy 🔍', () => {
    it('should prioritize the metadata task field', () => {
        const metadata = { task: 'Metadata Title' };
        const firstLine = 'First Line Title';
        const filename = '202301011200_abc_Filename.md';

        expect(resolveTaskTitle(metadata, firstLine, filename)).toBe('Metadata Title');
    });

    it('should fallback to the first line if metadata is missing', () => {
        const metadata = {};
        const firstLine = 'First Line Title';
        const filename = '202301011200_abc_Filename.md';

        expect(resolveTaskTitle(metadata, firstLine, filename)).toBe('First Line Title');
    });

    it('should strip markdown headers from the first line', () => {
        const metadata = {};
        const firstLine = '# Deeply Nested Title';
        const filename = 'File.md';

        expect(resolveTaskTitle(metadata, firstLine, filename)).toBe('Deeply Nested Title');
    });

    it('should strip Zettelkasten prefixes from the filename', () => {
        const metadata = {};
        const firstLine = null;
        const filename = '202401261100_xyz_Actual Task Name.md';

        expect(resolveTaskTitle(metadata, firstLine, filename)).toBe('Actual Task Name');
    });

    it('should use the raw filename if no prefix exists', () => {
        const metadata = {};
        const firstLine = null;
        const filename = 'Simple Task.md';

        expect(resolveTaskTitle(metadata, firstLine, filename)).toBe('Simple Task');
    });

    it('should handle missing metadata and null first line', () => {
        const metadata = null;
        const firstLine = null;
        const filename = 'Fallback.md';

        expect(resolveTaskTitle(metadata, firstLine, filename)).toBe('Fallback');
    });
});
