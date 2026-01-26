import { ItemView, WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import TriageViewSvelte from './TriageView.svelte';
import { type TaskNode } from '../scheduler.js';
import { type KeybindingSettings, DEFAULT_KEYBINDINGS } from '../keybindings.js';
import { type HistoryManager } from '../history.js';
import { FileLogger } from '../logger.js';

export const VIEW_TYPE_TRIAGE = "todo-flow-triage-view";

export class TriageView extends ItemView {
    component: any;
    tasks: TaskNode[];
    keys: KeybindingSettings;
    onComplete: (results: { shortlist: TaskNode[], notNow: TaskNode[] }) => void;
    historyManager: HistoryManager;
    logger: FileLogger | undefined;

    constructor(leaf: WorkspaceLeaf, tasks: TaskNode[], keys: KeybindingSettings, historyManager: HistoryManager, logger: FileLogger | undefined, onComplete: (results: { shortlist: TaskNode[], notNow: TaskNode[] }) => void) {
        super(leaf);
        this.tasks = tasks;
        this.keys = keys || DEFAULT_KEYBINDINGS;
        this.historyManager = historyManager;
        this.logger = logger;
        this.onComplete = onComplete;
    }

    getViewType() {
        return VIEW_TYPE_TRIAGE;
    }

    getDisplayText() {
        return "Task Triage";
    }

    async onOpen() {
        this.registerDomEvent(window, 'keydown', (e: KeyboardEvent) => {
            if (this.app.workspace.getActiveViewOfType(TriageView) !== this) return;

            if (this.component) {
                this.component.handleKeyDown(e);
            }
        });

        this.component = mount(TriageViewSvelte, {
            target: this.contentEl,
            props: {
                app: this.app,
                tasks: this.tasks,
                keys: this.keys,
                debug: this.keys.debug,
                historyManager: this.historyManager,
                onComplete: (results: any) => {
                    this.onComplete(results);
                    // Optionally close the view
                    this.leaf.detach();
                }
            }
        });
    }

    async onClose() {
        if (this.component) {
            unmount(this.component);
        }
    }
}
