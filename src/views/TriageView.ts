import { ItemView, WorkspaceLeaf, type Modifier, Notice } from 'obsidian';
import { mount, unmount } from 'svelte';
import TriageViewSvelte from './TriageView.svelte';
import { type TaskNode } from '../scheduler.js';
import { type KeybindingSettings, DEFAULT_KEYBINDINGS } from '../keybindings.js';
import { parseTitleFromFilename } from '../persistence.js';
import { type HistoryManager } from '../history.js';
import { FileLogger } from '../logger.js';
import { type TodoFlowSettings } from '../main.js';
import { StackPersistenceService } from '../services/StackPersistenceService.js';
import { QuickAddModal } from '../ui/QuickAddModal.js';
import { type ViewManager } from '../ViewManager.js';

export const VIEW_TYPE_TRIAGE = "todo-flow-triage-view";

export class TriageView extends ItemView {
    component: any;
    tasks: TaskNode[];
    settings: TodoFlowSettings;
    keys: KeybindingSettings;
    onComplete: (results: { shortlist: TaskNode[], notNow: TaskNode[], strategy?: 'merge' | 'overwrite' }) => void;
    historyManager: HistoryManager;
    logger: FileLogger | undefined;
    viewManager: ViewManager;
    onCreateTask: (title: string, options?: any) => Promise<TaskNode>;
    persistenceService: StackPersistenceService;
    rootPath: string | null;

    private isModalOpen: boolean = false;
    private lastModalCloseTime: number = 0;

    constructor(
        leaf: WorkspaceLeaf,
        tasks: TaskNode[],
        settings: TodoFlowSettings,
        historyManager: HistoryManager,
        logger: FileLogger | undefined,
        viewManager: ViewManager,

        onComplete: (results: { shortlist: TaskNode[], notNow: TaskNode[], strategy?: 'merge' | 'overwrite' }) => void,
        onCreateTask: (title: string, options?: any) => Promise<TaskNode>,
        persistenceService: StackPersistenceService,
        rootPath: string | null,
        checkForConflict?: () => Promise<boolean> // New optional prop
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
        this.persistenceService = persistenceService;
        this.rootPath = rootPath;
        this.checkForConflict = checkForConflict;
    }

    // Add property to class
    checkForConflict: (() => Promise<boolean>) | undefined;

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

            // Robust check: Ignore if typing in an input/textarea/contentEditable
            const target = e.target as HTMLElement;
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable) {
                if (this.logger) this.logger.info(`[TriageView] Key blocked because target is input: ${target.tagName}`);
                return;
            }

            if (e.defaultPrevented) return;

            // Block keys if modal is open OR was recently closed (prevent leak)
            const timeSinceClose = Date.now() - this.lastModalCloseTime;
            if (this.isModalOpen || timeSinceClose < 500) {
                if (this.logger) this.logger.info(`[TriageView] Key blocked: ${e.key} (ModalOpen: ${this.isModalOpen}, TimeSinceClose: ${timeSinceClose})`);
                e.preventDefault();
                e.stopPropagation();
                return;
            }

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
                historyManager: this.historyManager,
                logger: this.logger,
                contentEl: this.contentEl,
                onComplete: (results: any) => {
                    this.onComplete(results);
                    // Optionally close the view
                    this.leaf.detach();
                },
                openQuickAddModal: () => this.openAddModal(),
                checkForConflict: this.checkForConflict // Pass to Svelte
            }
        });

        // Ensure focus for Scope activation
        this.contentEl.focus();
    }

    openAddModal() {
        this.isModalOpen = true;

        const modal = new QuickAddModal(this.app, async (result) => {
            if (result.type === 'new' && result.title) {
                const options: any = {};
                if (result.startTime) options.startTime = result.startTime;
                if (result.duration !== undefined) options.duration = result.duration;
                if (result.isAnchored !== undefined) options.isAnchored = result.isAnchored;

                // Optimistic UI: Update view immediately
                const tempId = `temp-${Date.now()}`;
                const tempNode: TaskNode = {
                    id: tempId,
                    title: result.title || 'Untitled',
                    status: 'todo',
                    duration: options.duration || 30,
                    startTime: options.startTime,
                    isAnchored: !!options.isAnchored,
                    children: []
                };

                // Implementation of Interaction Token: Claim lock for temp node creation
                if (this.persistenceService && this.rootPath) {
                    this.persistenceService.claimLock(this.rootPath, `triage-add-${tempId}`);
                }

                if (this.component && typeof this.component.addTaskToQueue === 'function') {
                    if (this.logger) this.logger.info(`[TriageView] Adding NEW task to queue: ${result.title}`);
                    this.component.addTaskToQueue(tempNode);
                } else if (this.logger) {
                    this.logger.error(`[TriageView] CRITICAL: addTaskToQueue MISSING on component!`);
                }

                // Background: Create actual file
                this.onCreateTask(result.title, options).then((newNode) => {
                    if (newNode) {
                        tempNode.id = newNode.id; // Update ID with real path
                        // Ideally we'd update other props if they changed during creation
                    } else {
                        // Rollback or Error state?
                        if (this.logger) this.logger.error(`[TriageView] Failed to create task for ${result.title}`);
                    }

                    // Release lock after resolution
                    if (this.persistenceService && this.rootPath) {
                        this.persistenceService.releaseLock(this.rootPath, `triage-add-${tempId}`);
                    }
                });
            } else if (result.type === 'file' && result.file) {
                // BUG-012: Handle existing file selection
                const file = result.file;
                const cleanTitle = parseTitleFromFilename(file.name).replace(/\.md$/, '');
                const newNode: TaskNode = {
                    id: file.path,
                    title: cleanTitle,
                    duration: 30,
                    status: 'todo' as const,
                    isAnchored: false,
                    children: []
                };

                try {
                    // 1. Optimistic UI + Async Disk Sync
                    // The 'true' flag tells the component/controller to handle persistence
                    if (this.component && typeof this.component.addTaskToQueue === 'function') {
                        if (this.logger) this.logger.info(`[TriageView] Adding EXISTING task to queue: ${newNode.title}`);
                        this.component.addTaskToQueue(newNode, true);
                        new Notice(`Added to Triage: ${newNode.title}`);
                    } else if (this.logger) {
                        this.logger.error(`[TriageView] CRITICAL: addTaskToQueue MISSING on component!`);
                    }
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    if (this.logger) this.logger.error(`[TriageView] Error during existing task selection: ${msg}`);
                    new Notice("Failed to add existing task to triage.");
                }
            }
        }, VIEW_TYPE_TRIAGE);

        const originalOnClose = modal.onClose.bind(modal);
        modal.onClose = () => {
            this.lastModalCloseTime = Date.now();
            originalOnClose();
            // Delay unblocking keys to ensure the Enter key event doesn't propagate to TriageView
            // after the modal closes but during the same event loop tick.
            setTimeout(() => {
                this.isModalOpen = false;
                if (this.logger) this.logger.info('[TriageView] QuickAddModal Closed (Re-enabling Keys after 500ms delay)');
            }, 500);
        };

        modal.open();
    }

    onActivate() {
        this.contentEl.focus();
    }

    async onClose() {
        if (this.logger) this.logger.info('[TriageView] onClose triggered. Unmounting component.');
        if (this.component) {
            unmount(this.component);
        }
    }
}
