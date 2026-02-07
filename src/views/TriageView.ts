import { ItemView, WorkspaceLeaf, type Modifier } from 'obsidian';
import { mount, unmount } from 'svelte';
import TriageViewSvelte from './TriageView.svelte';
import { type TaskNode } from '../scheduler.js';
import { type KeybindingSettings, DEFAULT_KEYBINDINGS } from '../keybindings.js';
import { parseTitleFromFilename } from '../persistence.js';
import { type HistoryManager } from '../history.js';
import { FileLogger } from '../logger.js';
import { type TodoFlowSettings } from '../main.js';
import { QuickAddModal } from '../ui/QuickAddModal.js';
import { type ViewManager } from '../ViewManager.js';

export const VIEW_TYPE_TRIAGE = "todo-flow-triage-view";

export class TriageView extends ItemView {
    component: any;
    tasks: TaskNode[];
    settings: TodoFlowSettings;
    keys: KeybindingSettings;
    onComplete: (results: { shortlist: TaskNode[], notNow: TaskNode[] }) => void;
    historyManager: HistoryManager;
    logger: FileLogger | undefined;
    viewManager: ViewManager;
    onCreateTask: (title: string, options?: any) => Promise<TaskNode>;

    constructor(
        leaf: WorkspaceLeaf,
        tasks: TaskNode[],
        settings: TodoFlowSettings,
        historyManager: HistoryManager,
        logger: FileLogger | undefined,
        viewManager: ViewManager,
        onComplete: (results: { shortlist: TaskNode[], notNow: TaskNode[] }) => void,
        onCreateTask: (title: string, options?: any) => Promise<TaskNode>
    ) {
        super(leaf);
        this.tasks = tasks;
        this.settings = settings;
        this.keys = settings.keys || DEFAULT_KEYBINDINGS;
        this.historyManager = historyManager;
        this.logger = logger;
        this.viewManager = viewManager;
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
        // Strict Centralized Sovereignty check
        this.registerDomEvent(window, 'keydown', (e: KeyboardEvent) => {
            if (!this.viewManager.isSovereign((this.leaf as any).id)) return;

            // @ts-ignore
            window.LAST_SHORTCUT_VIEW = this.getViewType();

            if (this.component) {
                this.component.handleKeyDown(e);
            }
        });

        this.containerEl.tabIndex = 0;
        this.contentEl.focus();

        this.component = mount(TriageViewSvelte, {
            target: this.contentEl,
            props: {
                app: this.app,
                tasks: this.tasks,
                keys: this.keys,
                settings: this.settings,
                debug: this.keys.debug,
                historyManager: this.historyManager,
                logger: this.logger,
                onComplete: (results: any) => {
                    this.onComplete(results);
                    // Optionally close the view
                    this.leaf.detach();
                },
                openQuickAddModal: () => {
                    new QuickAddModal(this.app, async (result) => {
                        if (result.type === 'new' && result.title) {
                            if (this.logger) this.logger.info(`[TriageView] Modal returned NEW task: ${result.title}`);
                            const options: any = {};
                            if (result.startTime) options.startTime = result.startTime;
                            if (result.duration !== undefined) options.duration = result.duration;
                            if (result.isAnchored !== undefined) options.isAnchored = result.isAnchored;

                            const newNode = await this.onCreateTask(result.title, options);
                            if (newNode && this.component) {
                                if (this.logger) this.logger.info(`[TriageView] Adding NEW node to queue: ${newNode.id}`);
                                if (typeof this.component.addTaskToQueue === 'function') {
                                    this.component.addTaskToQueue(newNode);
                                } else {
                                    if (this.logger) this.logger.error('[TriageView] addTaskToQueue is NOT a function on component!');
                                    new (window as any).Notice('Error: Triage View component error.');
                                }
                            }
                        } else if (result.type === 'file' && result.file) {
                            if (this.logger) this.logger.info(`[TriageView] Modal returned EXISTING file: ${result.file.path}`);
                            // Convert TFile to TaskNode
                            const existingNode: TaskNode = {
                                id: result.file.path,
                                title: parseTitleFromFilename(result.file.basename),
                                duration: 30, // Default for triage
                                status: 'todo',
                                isAnchored: false,
                                children: []
                            };
                            if (this.component) {
                                if (this.logger) this.logger.info(`[TriageView] Adding EXISTING node to queue: ${existingNode.id}`);
                                if (typeof this.component.addTaskToQueue === 'function') {
                                    this.component.addTaskToQueue(existingNode);
                                } else {
                                    if (this.logger) this.logger.error('[TriageView] addTaskToQueue is NOT a function on component!');
                                    new (window as any).Notice('Error: Triage View component error.');
                                }
                            }
                        }
                    }).open();
                }
            }
        });

        // Ensure focus for Scope activation
        this.contentEl.focus();
    }

    onActivate() {
        this.contentEl.focus();
    }

    async onClose() {
        if (this.component) {
            unmount(this.component);
        }
    }
}
