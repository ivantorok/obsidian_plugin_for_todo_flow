import { ItemView, WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import TriageViewSvelte from './TriageView.svelte';
import { type TaskNode } from '../scheduler.js';
import { type KeybindingSettings, DEFAULT_KEYBINDINGS } from '../keybindings.js';
import { type HistoryManager } from '../history.js';
import { FileLogger } from '../logger.js';
import { type TodoFlowSettings } from '../main.js';

export const VIEW_TYPE_TRIAGE = "todo-flow-triage-view";

export class TriageView extends ItemView {
    component: any;
    tasks: TaskNode[];
    settings: TodoFlowSettings;
    keys: KeybindingSettings;
    onComplete: (results: { shortlist: TaskNode[], notNow: TaskNode[] }) => void;
    historyManager: HistoryManager;
    logger: FileLogger | undefined;
    onCreateTask: (title: string, options?: any) => TaskNode;

    constructor(
        leaf: WorkspaceLeaf,
        tasks: TaskNode[],
        settings: TodoFlowSettings,
        historyManager: HistoryManager,
        logger: FileLogger | undefined,
        onComplete: (results: { shortlist: TaskNode[], notNow: TaskNode[] }) => void,
        onCreateTask: (title: string, options?: any) => TaskNode
    ) {
        super(leaf);
        this.tasks = tasks;
        this.settings = settings;
        this.keys = settings.keys || DEFAULT_KEYBINDINGS;
        this.historyManager = historyManager;
        this.logger = logger;
        this.onComplete = onComplete;
        this.onCreateTask = onCreateTask;
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
                settings: this.settings,
                debug: this.keys.debug,
                historyManager: this.historyManager,
                onComplete: (results: any) => {
                    this.onComplete(results);
                    // Optionally close the view
                    this.leaf.detach();
                },
                openQuickAddModal: () => {
                    // Import dynamically to avoid circular deps if any
                    import('../ui/QuickAddModal.js').then(({ QuickAddModal }) => {
                        new QuickAddModal(this.app, async (result) => {
                            if (result.type === 'new' && result.title) {
                                const options: any = {};
                                if (result.startTime) options.startTime = result.startTime;
                                if (result.duration !== undefined) options.duration = result.duration;
                                if (result.isAnchored !== undefined) options.isAnchored = result.isAnchored;

                                const newNode = this.onCreateTask(result.title, options);
                                if (newNode && this.component) {
                                    // Add to the Triage Queue via Component/Controller
                                    this.component.addTaskToQueue(newNode);
                                }
                            }
                        }).open();
                    });
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
