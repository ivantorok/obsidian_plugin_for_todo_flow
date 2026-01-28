import { ItemView, WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import StackViewSvelte from './StackView.svelte';
import { computeSchedule, type TaskNode } from '../scheduler.js';
import { type KeybindingSettings, DEFAULT_KEYBINDINGS } from '../keybindings.js';
import { formatKeys, parseKeys } from '../utils/settings-utils.js';
import { type HistoryManager } from '../history.js';
import { serializeStackToMarkdown } from '../persistence.js';
import { FileLogger } from '../logger.js';
import { StackLoader } from '../loaders/StackLoader.js';
import { NavigationManager } from '../navigation/NavigationManager.js';
import { type TodoFlowSettings } from '../main.js';
import { QuickAddModal } from '../ui/QuickAddModal.js';
import { InsertTaskCommand } from '../commands/stack-commands.js';
import moment from 'moment';

export const VIEW_TYPE_STACK = "todo-flow-stack-view";

export class StackView extends ItemView {
    component: any;
    rootPath: string | null = null;
    private currentTaskIds: string[] | null = null;
    tasks: TaskNode[] = [];
    settings: TodoFlowSettings;
    historyManager: HistoryManager;
    logger: FileLogger;
    onTaskUpdate: (task: TaskNode) => void;
    onTaskCreate: (title: string, options?: { startTime?: moment.Moment, duration?: number, isAnchored?: boolean }) => TaskNode;
    loader: StackLoader;
    navManager: NavigationManager;

    constructor(leaf: WorkspaceLeaf, settings: TodoFlowSettings, historyManager: HistoryManager, logger: FileLogger, onTaskUpdate: (task: TaskNode) => void, onTaskCreate: (title: string, options?: { startTime?: moment.Moment, duration?: number, isAnchored?: boolean }) => TaskNode) {
        super(leaf);
        this.settings = settings;
        this.historyManager = historyManager;
        this.logger = logger;
        this.onTaskUpdate = onTaskUpdate;
        this.onTaskCreate = onTaskCreate;

        // Initialize navigation services
        this.loader = new StackLoader(this.app, this.logger);
        this.navManager = new NavigationManager(
            this.loader,
            (tasks) => computeSchedule(tasks, moment())
        );
    }

    getViewType() {
        return VIEW_TYPE_STACK;
    }

    getDisplayText() {
        return "Daily Stack";
    }

    getState(): Record<string, unknown> {
        const navState = this.navManager.getState();
        return {
            rootPath: this.rootPath,
            navState: navState // Save full navigation history
        };
    }

    async setState(state: any, result: any): Promise<void> {
        if (this.logger) await this.logger.info(`[StackView] setState triggered. State keys: ${Object.keys(state || {}).join(', ')}`);

        const now = this.getNow();
        if (this.logger) await this.logger.info(`[StackView] Schedule Basis: ${now.format('YYYY-MM-DD HH:mm')} (Mode: ${this.settings.timingMode})`);

        if (!state) {
            if (this.logger) await this.logger.warn(`[StackView] [UNHAPPY] setState received null/undefined state.`);
        } else if (!state.rootPath && !state.ids) {
            if (this.logger) await this.logger.warn(`[StackView] [UNHAPPY] setState received valid state object but MISSING rootPath OR ids. Keys: ${JSON.stringify(state)}`);
        }

        if (state && (state.rootPath || state.ids)) {

            let rawTasks: TaskNode[] = [];

            // Case 1: Restore from full Navigation History (Feature)
            const hasHistory = state.navState?.history && state.navState.history.length > 0;
            const hasStack = state.navState?.currentStack && state.navState.currentStack.length > 0;

            if (state.navState && (hasHistory || hasStack)) {
                if (this.logger) await this.logger.info(`[StackView] Restoring full navigation state (Depth: ${state.navState.history?.length || 0})`);

                // Restore the manager's state directly
                this.navManager.setState(state.navState);

                // Sync local view state
                this.tasks = this.navManager.getCurrentStack();
                this.rootPath = state.rootPath || state.navState.currentSource; // Fallback or sync

                if (this.logger) await this.logger.info(`[StackView] State restored. Current Stack: ${this.tasks.length} items.`);

                // Update component
                if (this.component && this.component.setTasks) {
                    this.component.setTasks(this.tasks);
                    // attempt to restore focus if saved
                    if (state.navState.currentFocusedIndex !== undefined) {
                        this.component.setFocus(state.navState.currentFocusedIndex);
                    }
                }

                return; // early exit, we are done
            }

            // Case 2: Standard Load (Root or Explicit)
            if (state.rootPath === 'QUERY:SHORTLIST') {
                if (this.logger) await this.logger.info(`[StackView] Loading shortlisted tasks...`);
                rawTasks = await this.loader.loadShortlisted();
                if (this.logger) await this.logger.info(`[StackView] Loaded ${rawTasks.length} shortlisted tasks.`);
                this.rootPath = 'QUERY:SHORTLIST';
            } else if (state.ids && Array.isArray(state.ids)) {
                // EXPLICIT MODE (Session Isolation)
                if (this.logger) await this.logger.info(`[StackView] EXPLICIT MODE: Loading ${state.ids.length} tasks into Tray.`);

                this.currentTaskIds = state.ids;

                rawTasks = await this.loader.loadSpecificFiles(state.ids);
                this.rootPath = `EXPLICIT:${state.ids.length}`;
            } else {
                if (this.logger) await this.logger.info(`[StackView] PATH MODE: Loading tasks from ${state.rootPath}`);
                this.rootPath = state.rootPath;
                // Load initial stack via unified loader
                rawTasks = await this.loader.load(state.rootPath);
            }

            if (rawTasks.length === 0) {
                if (this.logger) await this.logger.warn(`[StackView] [UNHAPPY] Loaded 0 tasks for rootPath="${this.rootPath}". Is directory empty or invalid?`);
            }

            const initialTasks = computeSchedule(rawTasks, now);
            await this.logStackDetails(initialTasks, 'Initial Load');

            // Update NavigationManager
            this.navManager.setStack(initialTasks, this.rootPath!);

            // Update local tasks state
            this.tasks = this.navManager.getCurrentStack();

            // Update component if mounted
            if (this.component && this.component.setTasks) {
                this.component.setTasks(this.tasks);
            }
        }

        await super.setState(state, result);
    }

    async reload(): Promise<void> {
        const preCount = this.tasks ? this.tasks.length : 0;
        if (this.logger) await this.logger.info(`[StackView] Reload triggered. Current tasks: ${preCount}`);

        // Strategy: Re-call setState with the existing full state.
        // This forces a re-read from disk via the loader while preserving navigation context.
        const state: any = this.getState();

        // Capture current focus safely
        let focusedId: string | null = null;
        if (this.component && typeof (this.component as any).getFocusedIndex === 'function') {
            const currentFocusIndex = (this.component as any).getFocusedIndex();
            const focusedTask = this.tasks && this.tasks[currentFocusIndex];
            if (focusedTask) focusedId = focusedTask.id;
        }

        if (this.currentTaskIds && this.currentTaskIds.length > 0) {
            if (this.logger) await this.logger.info(`[StackView] Reloading EXPLICIT list (${this.currentTaskIds.length} IDs).`);
            state.ids = this.currentTaskIds;
            await this.setState(state, null);

            // Restore focus
            if (focusedId && this.tasks) {
                const newIndex = this.tasks.findIndex((t: any) => t.id === focusedId);
                if (newIndex !== -1 && this.component) {
                    this.component.setFocus(newIndex);
                } else {
                    if (this.logger) await this.logger.warn(`[StackView] [UNHAPPY] Could not restore focus to task ID="${focusedId}". Task not found in reloaded stack.`);
                }
            }

            const postCount = this.tasks ? this.tasks.length : 0;
            if (this.logger) await this.logger.info(`[StackView] Reload complete. New tasks: ${postCount}`);

        } else if (this.rootPath) {
            if (!this.rootPath.startsWith('EXPLICIT')) {
                state.rootPath = this.rootPath;
                await this.setState(state, null);

                // Restore focus
                if (focusedId && this.tasks) {
                    const newIndex = this.tasks.findIndex((t: any) => t.id === focusedId);
                    if (newIndex !== -1 && this.component) {
                        this.component.setFocus(newIndex);
                    } else {
                        if (this.logger) await this.logger.warn(`[StackView] [UNHAPPY] Could not restore focus to task ID="${focusedId}". Task not found in reloaded stack.`);
                    }
                }

                const postCount = this.tasks ? this.tasks.length : 0;
                if (this.logger) await this.logger.info(`[StackView] Reload complete. New tasks: ${postCount}`);
            } else {
                this.logger.warn(`[StackView] Skipping reload for EXPLICIT mode (no IDs in memory).`);
            }
        } else {
            if (this.logger) await this.logger.warn(`[StackView] [UNHAPPY] Reload called but NO rootPath or valid IDs available. Cannot reload.`);
        }
    }

    async onOpen() {
        this.registerDomEvent(window, 'keydown', (e: KeyboardEvent) => {
            // Respect handled events
            if (e.defaultPrevented) return;

            // Log event receipt
            if (this.settings.keys.debug) {
                this.logger.info(`[TRACE] window keydown: ${e.key} (code: ${e.code})`);
            }

            // More permissive check: Is this leaf visible?
            if (!this.leaf.view || this.app.workspace.getActiveViewOfType(StackView) !== this) {
                // Temporary removal of strict check to debug
                // if (this.settings.keys.debug) this.logger.info(`[TRACE] Skipping keydown: not active view`);
                // return;
            }

            // Call the component's handler
            if (this.component) {
                this.component.handleKeyDown(e);
            }
        });

        this.component = mount(StackViewSvelte, {
            target: this.contentEl,
            props: {
                initialTasks: this.tasks,
                settings: this.settings,
                now: this.getNow(),
                historyManager: this.historyManager,
                logger: this.logger,
                onTaskUpdate: this.onTaskUpdate,
                onTaskCreate: this.onTaskCreate,
                onStackChange: (tasks: TaskNode[]) => {
                    this.tasks = tasks;
                    this.navManager.setStack(tasks, this.rootPath!);
                    this.app.workspace.requestSaveLayout();
                },
                // openTaskModal: Removed in favor of QuickAddModal unification
                openQuickAddModal: (currentIndex: number) => {
                    new QuickAddModal(this.app, async (result) => {
                        let nodeToInsert: TaskNode | null = null;

                        if (result.type === 'new' && result.title) {
                            // Pass parsed metadata for creation
                            const options: { startTime?: moment.Moment, duration?: number, isAnchored?: boolean } = {};
                            if (result.startTime) options.startTime = result.startTime;
                            if (result.duration !== undefined) options.duration = result.duration;
                            if (result.isAnchored !== undefined) options.isAnchored = result.isAnchored;

                            nodeToInsert = this.onTaskCreate(result.title, options);
                        } else if (result.type === 'file' && result.file) {
                            // Load the specific file as a TaskNode
                            const nodes = await this.loader.loadSpecificFiles([result.file.path]);
                            if (nodes.length > 0) {
                                nodeToInsert = nodes[0]!;
                            }
                        }

                        if (nodeToInsert && this.component) {
                            const controller = this.component.getController();
                            if (controller) {
                                const cmd = new InsertTaskCommand(controller, currentIndex, nodeToInsert);
                                await this.historyManager.executeCommand(cmd);

                                // Refresh component
                                if (this.component.update) {
                                    this.component.update();
                                    if (cmd.resultIndex !== null) {
                                        this.component.setFocus(cmd.resultIndex);
                                    }
                                }
                            }
                        }
                    }).open();
                },
                onOpenFile: (path: string) => {
                    this.app.workspace.openLinkText(path, '', true);
                },
                onNavigate: async (path: string, currentFocus: number) => {
                    this.logger.info(`[StackView] ========== DRILL DOWN TRIGGERED ==========`);
                    this.logger.info(`[StackView] Navigating to: ${path} from index ${currentFocus}`);
                    this.logger.info(`[StackView] Current state BEFORE drillDown:`);
                    this.logger.info(`[StackView]   - this.tasks.length: ${this.tasks.length}`);
                    this.logger.info(`[StackView]   - History size: ${this.navManager.getState().history.length}`);

                    // Use NavigationManager to drill down
                    const success = await this.navManager.drillDown(path, currentFocus);

                    this.logger.info(`[StackView] NavigationManager.drillDown() result: success=${success}`);

                    if (success) {
                        // Update component with new stack
                        const newStack = this.navManager.getCurrentStack();
                        this.logger.info(`[StackView] Retrieved stack from NavigationManager: ${newStack.length} tasks`);

                        this.tasks = newStack;
                        this.rootPath = this.navManager.getState().currentSource;
                        this.logger.info(`[StackView] Updated this.tasks to ${this.tasks.length} tasks. New rootPath: ${this.rootPath}`);

                        this.logStackDetails(this.tasks, 'Drill Down Refreshed');

                        if (this.component && this.component.setTasks) {
                            this.logger.info(`[StackView] Calling component.setTasks() with ${this.tasks.length} tasks`);
                            this.component.setTasks(this.tasks);
                            this.logger.info(`[StackView] component.setTasks() completed`);

                            // New stack starts with focus at 0
                            if (this.component.setFocus) {
                                this.logger.info(`[StackView] Calling component.setFocus(0)`);
                                this.component.setFocus(0);
                            }
                        } else {
                            this.logger.warn(`[StackView] WARNING: component or component.setTasks is undefined!`);
                        }
                        this.logger.info(`[StackView] Drilled down successfully. New stack size: ${this.tasks.length}`);
                    } else {
                        this.logger.warn(`[StackView] Could not drill down into: ${path}. Falling back to opening file.`);
                        this.app.workspace.openLinkText(path, '', true);
                    }
                    this.logger.info(`[StackView] ========== DRILL DOWN FINISHED ==========`);
                },
                onGoBack: async () => {
                    this.logger.info(`[StackView] ========== GO BACK TRIGGERED ==========`);
                    this.logger.info(`[StackView] Current state BEFORE goBack:`);
                    this.logger.info(`[StackView]   - this.tasks.length: ${this.tasks.length}`);
                    this.logger.info(`[StackView]   - History size: ${this.navManager.getState().history.length}`);
                    this.logger.info(`[StackView]   - Current source: ${this.navManager.getState().currentSource}`);

                    // Use NavigationManager to go back
                    const result = await this.navManager.goBack();
                    const { success, focusedIndex } = result;

                    this.logger.info(`[StackView] NavigationManager.goBack() result: success=${success}, focusedIndex=${focusedIndex}`);

                    if (success) {
                        // Update component with previous stack
                        const newStack = this.navManager.getCurrentStack();
                        this.logger.info(`[StackView] Retrieved stack from NavigationManager: ${newStack.length} tasks`);

                        this.tasks = newStack;
                        this.rootPath = this.navManager.getState().currentSource;
                        this.logger.info(`[StackView] Updated this.tasks to ${this.tasks.length} tasks. New rootPath: ${this.rootPath}`);

                        await this.logStackDetails(this.tasks, 'Go Back Refreshed');

                        if (this.component && this.component.setTasks) {
                            this.logger.info(`[StackView] Calling component.setTasks() with ${this.tasks.length} tasks`);
                            this.component.setTasks(this.tasks);
                            this.logger.info(`[StackView] component.setTasks() completed`);

                            // Restore focus
                            if (this.component.setFocus) {
                                this.logger.info(`[StackView] Calling component.setFocus(${focusedIndex})`);
                                this.component.setFocus(focusedIndex);
                            }
                        } else {
                            this.logger.warn(`[StackView] WARNING: component or component.setTasks is undefined!`);
                            this.logger.warn(`[StackView]   - component exists: ${!!this.component}`);
                            this.logger.warn(`[StackView]   - component.setTasks exists: ${!!(this.component && this.component.setTasks)}`);
                        }
                        this.logger.info(`[StackView] Go back completed. Restored focus to ${focusedIndex}`);
                    } else {
                        this.logger.warn(`[StackView] Cannot go back. Result success: ${success}`);
                    }
                    this.logger.info(`[StackView] ========== GO BACK FINISHED ==========`);
                },
                onExport: async (tasks: TaskNode[]) => {
                    const content = serializeStackToMarkdown(tasks);
                    const filename = `Stack Export ${moment().format('YYYY-MM-DD HHmm')}.md`;

                    let path = filename;
                    if (this.settings.exportFolder) {
                        // Ensure folder exists
                        const adapter = this.app.vault.adapter;
                        if (!(await adapter.exists(this.settings.exportFolder))) {
                            await this.app.vault.createFolder(this.settings.exportFolder);
                        }
                        path = `${this.settings.exportFolder}/${filename}`;
                    }

                    await this.app.vault.create(path, content);
                    new (window as any).Notice(`Stack saved to ${path} `);
                }
            }
        });
    }

    private getNow(): moment.Moment {
        if (this.settings.timingMode === 'fixed' && this.settings.fixedStartTime) {
            const [hh, mm] = this.settings.fixedStartTime.split(':');
            return moment().set({
                hour: parseInt(hh || '9'),
                minute: parseInt(mm || '0'),
                second: 0,
                millisecond: 0
            });
        }
        return moment();
    }

    private async logStackDetails(tasks: TaskNode[], context: string) {
        if (!this.logger) return;
        this.logger.info(`[DEBUG][${context}] Stack Contents(${tasks.length} tasks): `);
        this.logger.info(`   FORMAT -> [Index] ID | Start: Displayed | Title: Displayed(On - Disk) | Dur: Displayed(On - Disk) | Status: Displayed(On - Disk) | Anchored: Displayed(On - Disk)`);

        for (let i = 0; i < tasks.length; i++) {
            const t = tasks[i]!;
            const disk = await this.loader.parser.resolveTaskMetadata(t.id);

            const startStr = t.startTime?.format('HH:mm') || '??:??';
            const titleMatch = t.title === disk.title ? t.title : `${t.title} (${disk.title})`;
            const durMatch = t.duration === disk.duration ? t.duration : `${t.duration} (${disk.duration})`;
            const statusMatch = t.status === disk.status ? t.status : `${t.status} (${disk.status})`;
            const anchorMatch = t.isAnchored === disk.isAnchored ? t.isAnchored : `${t.isAnchored} (${disk.isAnchored})`;

            this.logger.info(`   [${i}]ID: ${t.id} | Start: ${startStr} | Title: ${titleMatch} | Dur: ${durMatch} | Status: ${statusMatch} | Anchored: ${anchorMatch} `);

            // Log audit trail if durations differ (indicates a roll-up occurred)
            if (t.duration !== disk.duration && t.trace && t.trace.length > 0) {
                this.logger.info(`      ROLLUP AUDIT: ${t.trace.join(' | ')} `);
            }
        }
    }

    updateSettings(settings: TodoFlowSettings) {
        this.settings = settings;
        if (this.component) {
            if (this.component.updateSettings) {
                this.component.updateSettings(this.settings);
            }
            if (this.component.updateNow) {
                this.component.updateNow(this.getNow());
            }
        }
        this.logger.info(`[StackView] Settings updated (Hot Reload). Debug: ${this.settings.debug}`);
    }

    async onClose() {
        if (this.component) {
            unmount(this.component);
        }
    }

    getController() {
        if (this.component && this.component.getController) {
            return this.component.getController();
        }
        return null;
    }

    update() {
        if (this.component && this.component.update) {
            this.component.update();
        }
    }
}
