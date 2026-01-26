import { describe, it, expect } from 'vitest';
import { generateFilename } from '../persistence.js';
import moment from 'moment';

describe('Filename Generation', () => {
    it('should generate a filename with date, time, random string, and title', () => {
        const title = "My New Task";
        const filename = generateFilename(title);

        // Format: [YYYY-MM-DD-HHmm]-[4-digit-random]-[Title].md
        // Example: 2026-01-25-0615-a7b2-My-New-Task.md

        const timestamp = moment().format("YYYY-MM-DD-HHmm");
        expect(filename).toMatch(new RegExp(`^${timestamp}-[a-z0-9]{4}-My-New-Task\\.md$`));
    });

    it('should sanitize the title for the filename', () => {
        const title = "Task with / : * ? \" < > | characters";
        const filename = generateFilename(title);

        // Verify no illegal characters
        expect(filename).not.toMatch(/[\\/:*?"<>|]/);
        expect(filename).toContain("Task-with-characters");
    });
});
