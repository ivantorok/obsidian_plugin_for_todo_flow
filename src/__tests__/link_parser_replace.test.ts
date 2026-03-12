import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkParser } from '../../src/parsers/LinkParser';
import { App } from 'obsidian';
import { TaskNode } from '../../src/scheduler';

describe('LinkParser - replaceLinksInContent', () => {
    let mockApp: App;
    let parser: LinkParser;

    beforeEach(() => {
        mockApp = {
            metadataCache: {
                getFirstLinkpathDest: vi.fn(),
            },
            vault: {
                adapter: {
                    exists: vi.fn(),
                    read: vi.fn(),
                    write: vi.fn(),
                },
                getAbstractFileByPath: vi.fn(),
            }
        } as unknown as App;
        parser = new LinkParser(mockApp);
    });

    it('should replace an existing block of wikilinks with a new reordered block', () => {
        const originalContent = `# Parent Task\n\nSome description here.\n\n- [ ] [[Task A]]\n- [ ] [[Task B|Custom Name]]\n- [x] [[Task C]]\n\nFooter text.`;
        
        const newTasks: TaskNode[] = [
            { id: 'Task C.md', title: 'Task C', status: 'done', duration: 30, isAnchored: false, children: [] },
            { id: 'Task A.md', title: 'Task A', status: 'todo', duration: 30, isAnchored: false, children: [] },
            { id: 'Task B.md', title: 'Custom Name', status: 'todo', duration: 30, isAnchored: false, children: [] }
        ];

        const updatedContent = parser.replaceLinksInContent(originalContent, newTasks);

        const expectedContent = `# Parent Task\n\nSome description here.\n\n- [x] [[Task C|Task C]]\n- [ ] [[Task A|Task A]]\n- [ ] [[Task B|Custom Name]]\n\nFooter text.`;
        expect(updatedContent).toBe(expectedContent);
    });

    it('should append links to the bottom if no existing links are found', () => {
        const originalContent = `# Parent Task\n\nBrand new task, no children yet.`;
        
        const newTasks: TaskNode[] = [
            { id: 'Task X.md', title: 'Task X', status: 'todo', duration: 30, isAnchored: false, children: [] },
            { id: 'Task Y.md', title: 'Task Y', status: 'todo', duration: 30, isAnchored: false, children: [] }
        ];

        const updatedContent = parser.replaceLinksInContent(originalContent, newTasks);

        const expectedContent = `# Parent Task\n\nBrand new task, no children yet.\n\n- [ ] [[Task X|Task X]]\n- [ ] [[Task Y|Task Y]]`;
        expect(updatedContent).toBe(expectedContent);
    });
    
    it('should handle lists that have spacing between them', () => {
        const originalContent = `Title\n\n- [ ] [[one]]\n\n- [ ] [[two]]`;
        
        const newTasks: TaskNode[] = [
            { id: 'two.md', title: 'two', status: 'todo', duration: 30, isAnchored: false, children: [] },
            { id: 'one.md', title: 'one', status: 'todo', duration: 30, isAnchored: false, children: [] }
        ];

        const updatedContent = parser.replaceLinksInContent(originalContent, newTasks);

        const expectedContent = `Title\n\n- [ ] [[two|two]]\n- [ ] [[one|one]]`;
        expect(updatedContent).toBe(expectedContent);
    });

    it('should strip .md suffix from task IDs for output wikilinks', () => {
        const originalContent = `Title`;
        const newTasks: TaskNode[] = [
            { id: 'folder/Subtask.md', title: 'Subtask', status: 'todo', duration: 30, isAnchored: false, children: [] }
        ];

        const updatedContent = parser.replaceLinksInContent(originalContent, newTasks);
        expect(updatedContent).toContain('[[folder/Subtask|Subtask]]');
    });
});
