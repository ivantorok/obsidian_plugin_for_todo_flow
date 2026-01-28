import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuickAddModal } from '../ui/QuickAddModal.js';

// Simple mock for Obsidian types without relying on complex imports
class MockTFile {
    path: string;
    basename: string;
    parent = { path: '/' };
    constructor(path: string = '') {
        this.path = path;
        this.basename = path.split('/').pop()?.replace('.md', '') || path;
    }
}

vi.mock('obsidian', () => {
    return {
        App: vi.fn(),
        TFile: class {
            path: string = '';
            basename: string = '';
        },
        FuzzySuggestModal: class {
            app: any;
            constructor(app: any) { this.app = app; }
            setPlaceholder() { }
            getSuggestions(query: string) {
                if (query.toLowerCase() === 'existing') {
                    return [
                        { item: new MockTFile('Existing.md'), score: 10, matches: [] }
                    ];
                }
                return [];
            }
        }
    };
});

describe('QuickAddModal UX Logic (Option B)', () => {
    let mockApp: any;
    let onChoose: any;
    let modal: QuickAddModal;

    beforeEach(() => {
        mockApp = {
            vault: {
                getMarkdownFiles: vi.fn().mockReturnValue([])
            }
        };
        onChoose = vi.fn();
        modal = new QuickAddModal(mockApp, onChoose);
    });

    it('should NOT unshift "New Task" to the top when matches exist (Option B)', () => {
        // We set the query so the modal knows what it is
        const suggestions = modal.getSuggestions('Existing');

        // Option B: First item should be the file, not the 'NEW' item
        expect(suggestions[0]!.item).not.toHaveProperty('isNew');
        expect((suggestions[0]!.item as any).path).toBe('Existing.md');
    });

    it('should still provide a "New Task" option (Ghost item) at the bottom', () => {
        const suggestions = modal.getSuggestions('Existing');
        const hasNew = suggestions.some(s => (s.item as any).isNew);
        expect(hasNew).toBe(true);
        // It should be at the end (index 1 in our 2-item mock)
        expect((suggestions[suggestions.length - 1]!.item as any).isNew).toBe(true);
    });

    it('should force a NEW task creation if Shift is held, even if an item is passed', () => {
        const mockFile = new MockTFile('Existing.md');
        const shiftEvent = { shiftKey: true } as KeyboardEvent;

        // Set the query
        modal.getSuggestions('Modified Title');
        modal.onChooseItem(mockFile as any, shiftEvent);

        expect(onChoose).toHaveBeenCalledWith({
            type: 'new',
            title: 'Modified Title',
            isAnchored: false
        });
    });

    it('should fallback to creating a NEW task on Enter if no matches exist', () => {
        const suggestions = modal.getSuggestions('NonExisting');
        expect(suggestions.length).toBe(1);
        expect((suggestions[0]!.item as any).isNew).toBe(true);

        modal.onChooseItem(suggestions[0]!.item, {} as KeyboardEvent);
        expect(onChoose).toHaveBeenCalledWith({
            type: 'new',
            title: 'NonExisting',
            isAnchored: false
        });
    });
});
