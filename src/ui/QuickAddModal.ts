import { App, FuzzySuggestModal, TFile, Scope, type FuzzyMatch } from 'obsidian';
import { DateParser } from '../utils/DateParser.js';
import moment from 'moment';

export interface QuickAddResult {
    type: 'file' | 'new';
    file?: TFile;
    title?: string;
    startTime?: moment.Moment;
    duration?: number;
    isAnchored?: boolean;
}

type QuickAddEntry = TFile | { isNew: true, title: string };

export class QuickAddModal extends FuzzySuggestModal<QuickAddEntry> {
    private onChoose: (result: QuickAddResult) => void;
    private currentQuery: string = '';

    constructor(app: App, onChoose: (result: QuickAddResult) => void) {
        super(app);
        this.onChoose = onChoose;
        this.setPlaceholder('Search for an existing task or type to create new...');
    }

    onOpen() {
        super.onOpen();

        // Register a stronger Shift+Enter handler in the modal's scope
        this.scope.register(['Shift'], 'Enter', (evt: KeyboardEvent) => {
            evt.preventDefault();
            // Trigger creation with current query
            const query = (this as any).inputEl.value;
            if (query) {
                this.onChooseItem({ isNew: true, title: query.trim() } as any, evt);
                this.close();
            }
            return false;
        });
    }

    onClose() {
        super.onClose();
        // Return focus to the stack view after the modal is disposed
        // We use requestAnimationFrame to ensure the modal is fully removed from DOM
        requestAnimationFrame(() => {
            const leaf = this.app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
            if (leaf) {
                this.app.workspace.revealLeaf(leaf);
                // The StackView.svelte handles its own focus on container focus
                const container = (leaf.view as any).contentEl.querySelector('.todo-flow-stack-container') as HTMLElement;
                if (container) container.focus();
            }
        });
    }

    getItems(): QuickAddEntry[] {
        // Return all markdown files as the base items
        return this.app.vault.getMarkdownFiles();
    }

    getItemText(item: QuickAddEntry): string {
        if ('isNew' in item) {
            return `Create new task: ${item.title}`;
        }
        return item.path;
    }

    /**
     * Override getSuggestions to inject the "New Task" ghost item
     */
    getSuggestions(query: string): FuzzyMatch<QuickAddEntry>[] {
        this.currentQuery = query;
        const suggestions = super.getSuggestions(query);

        if (query.trim()) {
            // Check if there is already an exact match to avoid duplicate logic
            const exactMatch = suggestions.find(s =>
                !('isNew' in s.item) && s.item.basename.toLowerCase() === query.trim().toLowerCase()
            );

            // Inject the "New Task" option at the BOTTOM
            const newEntry: QuickAddEntry = { isNew: true, title: query.trim() };
            suggestions.push({
                item: newEntry,
                match: { score: 100, matches: [] } // High score (worse match) to keep it at the end
            });
        }

        return suggestions;
    }

    renderSuggestion(match: FuzzyMatch<QuickAddEntry>, el: HTMLElement) {
        const item = match.item;
        if ('isNew' in item) {
            el.addClass('todo-flow-new-item');
            const div = el.createDiv({ cls: 'suggestion-content' });
            div.createEl('div', { text: '✨ ' + item.title, cls: 'suggestion-title' });
            div.createEl('div', { text: 'Create new task', cls: 'suggestion-note', attr: { style: 'font-size: 0.8em; opacity: 0.6;' } });
        } else {
            // Standard rendering for files
            el.createDiv({ text: item.path, cls: 'suggestion-title' });
            if (item.parent && item.parent.path !== '/') {
                el.createDiv({ text: item.parent.path, cls: 'suggestion-note', attr: { style: 'font-size: 0.8em; opacity: 0.6;' } });
            }
        }
    }

    async onChooseItem(item: QuickAddEntry, evt: MouseEvent | KeyboardEvent): Promise<void> {
        const isShift = evt.shiftKey;

        let inputString = '';

        if ('isNew' in item) {
            inputString = item.title;
        } else if (isShift) {
            inputString = this.currentQuery.trim() || item.basename;
        } else {
            // File selection - no parsing needed
            this.onChoose({ type: 'file', file: item });
            return;
        }

        // Parse NLP for new tasks
        const parsed = DateParser.parseTaskInput(inputString);

        const result: QuickAddResult = {
            type: 'new',
            title: parsed.title
        };
        if (parsed.startTime) result.startTime = parsed.startTime;
        if (parsed.duration !== undefined) result.duration = parsed.duration;
        if (parsed.isAnchored !== undefined) result.isAnchored = parsed.isAnchored;

        this.onChoose(result);
    }
}
