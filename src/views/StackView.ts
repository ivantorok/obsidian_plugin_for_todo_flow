import { ItemView, WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import StackViewSvelte from './StackView.svelte';
import { computeSchedule, type TaskNode } from '../scheduler.js';
import { type KeybindingSettings, DEFAULT_KEYBINDINGS } from '../keybindings.js';
import { formatKeys, parseKeys } from '../utils/settings-utils.js';
import { type HistoryManager } from '../history.js';
import { serializeStackToMarkdown, parseTitleFromFilename } from '../persistence.js';
import { FileLogger } from '../logger.js';
import { StackLoader } from '../loaders/StackLoader.js';
import { NavigationManager } from '../navigation/NavigationManager.js';
import { type TodoFlowSettings } from '../main.js';
import { QuickAddModal } from '../ui/QuickAddModal.js';
import { InsertTaskCommand } from '../commands/stack-commands.js';
import { ReprocessTaskCommand } from '../commands/ReprocessTaskCommand.js';
import { StackPersistenceService } from '../services/StackPersistenceService.js';
import { DurationPickerModal } from '../ui/DurationPickerModal.js';
import { ExportService } from '../services/ExportService.js';
import { SetDurationCommand } from '../commands/stack-commands.js';
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
    onTaskUpdate: (task: TaskNode) => void | Promise<void>;
    onTaskCreate: (title: string, options?: { startTime?: moment.Moment, duration?: number, isAnchored?: boolean }) => Promise<TaskNode>;
    loader: StackLoader;
    navManager: NavigationManager;
    persistenceService: StackPersistenceService;
    private lastSavedIds: string[] = [];
    private saveTimeout: number | null = null;

    constructor(leaf: WorkspaceLeaf, settings: TodoFlowSettings, historyManager: HistoryManager, logger: FileLogger, persistenceService: StackPersistenceService, onTaskUpdate: (task: TaskNode) => void | Promise<void>, onTaskCreate: (title: string, options?: { startTime?: moment.Moment, duration?: number, isAnchored?: boolean }) => Promise<TaskNode>) {
        super(leaf);
        this.settings = settings;
        this.historyManager = historyManager;
        this.logger = logger;
        this.persistenceService = persistenceService;
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

    getTasks(): TaskNode[] {
        return this.tasks;
    }

    getState(): Record<string, unknown> {
        const navState = this.navManager.getState();
        return {
            rootPath: this.rootPath,
            navState: navState // Save full navigation history
        };
    }

    async setState(state: any, result: any): Promise<void> {
        const now = this.getNow();
        if (this.logger) await this.logger.info(`[StackView] setState called. Root: ${state?.rootPath}, ForceRefresh: ${!!state?.navState?.forceRefresh}`);

        if (state && (state.rootPath || state.ids)) {
            let rawTasks: TaskNode[] = [];

            // Case 1: Restore from full Navigation History
            const hasHistory = state.navState?.history && state.navState.history.length > 0;
            const hasStack = state.navState?.currentStack && state.navState.currentStack.length > 0;

            // BUG-009 FIX: If forceRefresh is set, we skip Case 1 (memory cache) 
            // and proceed to Case 2 (disk reload), but we still restore the history breadcrumbs.
            if (state.navState && (hasHistory || hasStack) && !state.navState.forceRefresh) {
                if (this.logger) await this.logger.info(`[StackView] Restoring from memory/history.`);
                this.navManager.setState(state.navState);
                this.tasks = this.navManager.getCurrentStack();
                this.rootPath = state.rootPath || state.navState.currentSource;

                if (this.component && this.component.setTasks) {
                    this.component.setTasks(this.tasks);
                    if (state.navState.currentFocusedIndex !== undefined) {
                        this.component.setFocus(state.navState.currentFocusedIndex);
                    }
                }
                return;
            }

            // Case 2: Standard Load
            if (this.logger) await this.logger.info(`[StackView] Loading from DISK (Case 2).`);
            if (state.rootPath === 'QUERY:SHORTLIST') {
                rawTasks = await this.loader.loadShortlisted();
                this.rootPath = 'QUERY:SHORTLIST';
            } else if (state.ids && Array.isArray(state.ids)) {
                this.currentTaskIds = state.ids;
                rawTasks = await this.loader.loadSpecificFiles(state.ids);
                if (state.rootPath && !state.rootPath.startsWith('EXPLICIT')) {
                    this.rootPath = state.rootPath;
                } else {
                    this.rootPath = `EXPLICIT:${state.ids.length}`;
                }
            } else {
                this.rootPath = state.rootPath;
                if (this.logger) await this.logger.info(`[StackView] Calling loader.load(${state.rootPath})`);
                rawTasks = await this.loader.load(state.rootPath);
                if (this.logger) await this.logger.info(`[StackView] Loader returned ${rawTasks.length} tasks.`);
            }

            // BUG-009: Preserve history if we are in a forced refresh
            if (state.navState) {
                this.navManager.setState(state.navState);
            }

            const initialTasks = computeSchedule(rawTasks, now);
            this.navManager.setStack(initialTasks, this.rootPath!);
            this.tasks = this.navManager.getCurrentStack();

            if (this.component && this.component.setTasks) {
                this.component.setTasks(this.tasks);
            }

            // PERSISTENCE: Ensure "CurrentStack.md" is created/updated on load
            const persistencePath = `${this.settings.targetFolder}/CurrentStack.md`;
            if (this.rootPath === persistencePath || this.rootPath === 'CurrentStack.md') {
                try {
                    await this.persistenceService.saveStack(this.tasks, persistencePath);
                    this.lastSavedIds = this.tasks.map(t => `${t.id}:${t.status}`);
                } catch (e) {
                    if (this.logger) this.logger.error(`[StackView] Failed to save CurrentStack.md: ${e}`);
                    new (window as any).Notice(`Error creating CurrentStack.md: ${e}`);
                }
            }
        }

        await super.setState(state, result);
    }

    openAddModal() {
        if (this.logger) this.logger.info('[StackView] Opening Quick Add Modal via Command');
        new QuickAddModal(this.app, async (result: any) => {
            if (this.logger) this.logger.info(`[StackView] QuickAdd Result: ${JSON.stringify(result)}`);

            let newNode: TaskNode | null = null;

            if (result.type === 'new') {
                // Create new task node
                newNode = await this.onTaskCreate(result.title, { duration: 30 });
            } else if (result.type === 'file' && result.file) {
                // Existing file
                const file = result.file;
                newNode = {
                    id: file.path,
                    title: parseTitleFromFilename(file.name),
                    duration: 30,
                    status: 'todo' as const,
                    isAnchored: false,
                    children: []
                };
                // Resolve metadata
                const metadata = await this.loader.parser.resolveTaskMetadata(file.path);
                if (metadata) {
                    newNode = { ...newNode, ...metadata } as TaskNode;
                }
            }

            if (newNode) {
                // Add to TOP of stack
                this.tasks.unshift(newNode);

                // Update navigation manager
                this.navManager.setStack(this.tasks, this.rootPath!);

                // Update Component
                if (this.component && this.component.setTasks) {
                    this.component.setTasks(this.tasks);
                }

                // Trigger Persistence
                if (this.rootPath === 'CurrentStack.md' || (this.currentTaskIds && this.currentTaskIds.length > 0)) {
                    await this.persistenceService.saveStack(this.tasks, 'CurrentStack.md');
                }

                this.app.workspace.requestSaveLayout();
            }
        }).open();
    }

    async reload(): Promise<void> {
        const preCount = this.tasks ? this.tasks.length : 0;
        if (this.logger) await this.logger.info(`[StackView] Reload triggered. Current tasks: ${preCount}`);

        // Strategy: Re-call setState with the existing full state, but flag it as a reload.
        // This forces a re-read from disk via the loader while preserving navigation context.
        const state: any = this.getState();

        // BUG-009 FIX: If we have navState, it contains a stale task cache. 
        // We tell setState to ignore the tasks in navState and re-load from disk.
        if (state.navState) {
            state.navState.forceRefresh = true;
        }

        // Silent NLP Reprocess
        const controller = this.getController();
        if (controller) {
            const reprocessCmd = new ReprocessTaskCommand(controller, this.onTaskUpdate);
            await reprocessCmd.execute();
        }

        // Capture current focus safely
        let focusedId: string | null = null;
        if (this.component && typeof (this.component as any).getFocusedIndex === 'function') {
            const currentFocusIndex = (this.component as any).getFocusedIndex();
            const focusedTask = this.tasks && this.tasks[currentFocusIndex];
            if (focusedTask) focusedId = focusedTask.id;
        }

        if (this.rootPath && (this.rootPath.endsWith('.md') || !this.rootPath.startsWith('EXPLICIT')) && this.rootPath !== 'QUERY:SHORTLIST') {
            if (this.logger) await this.logger.info(`[StackView] Reload favoring rootPath: ${this.rootPath}`);
            state.rootPath = this.rootPath;
            await this.setState(state, null);

            // Restore focus
            if (focusedId && this.tasks) {
                const newIndex = this.tasks.findIndex((t: any) => t.id === focusedId);
                if (newIndex !== -1 && this.component) {
                    this.component.setFocus(newIndex);
                }
            }

            const postCount = this.tasks ? this.tasks.length : 0;
            if (this.logger) await this.logger.info(`[StackView] Reload complete (rootPath). New tasks: ${postCount}`);

        } else if (this.currentTaskIds && this.currentTaskIds.length > 0) {
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
            if (this.logger) await this.logger.info(`[StackView] Reload complete (IDs). New tasks: ${postCount}`);

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

        // Start Time Update Interval (every 60s) for "Flexible/Now" mode
        this.registerInterval(
            window.setInterval(() => {
                if (this.component && this.component.updateNow) {
                    // Only log if debug is strictly on to avoid noise
                    // if (this.settings.debug) this.logger.info('[StackView] Tick: Updating Now time');
                    this.component.updateNow(this.getNow());
                }
            }, 60 * 1000)
        );

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

                    // PERSISTENCE: Debounced save to CurrentStack.md
                    const persistencePath = `${this.settings.targetFolder}/CurrentStack.md`;
                    if (this.rootPath === persistencePath || this.rootPath === 'CurrentStack.md' || (this.currentTaskIds && this.currentTaskIds.length > 0)) {
                        // Guard: Don't save empty stack if we are just starting up or if we haven't finished loading yet.
                        // This avoids overwriting a valid CurrentStack.md with [] before setState finishes.
                        if (tasks.length === 0 && (!this.lastSavedIds || this.lastSavedIds.length === 0)) {
                            if (this.settings.keys.debug) this.logger.info(`[StackView] Skipping persistence of empty initial stack.`);
                            return;
                        }

                        const currentIds = tasks.map(t => `${t.id}:${t.status}`);
                        const idsChanged = JSON.stringify(currentIds) !== JSON.stringify(this.lastSavedIds);

                        if (idsChanged) {
                            if (this.saveTimeout) {
                                window.clearTimeout(this.saveTimeout);
                            }
                            this.saveTimeout = window.setTimeout(async () => {
                                const savePath = (this.rootPath && this.rootPath.includes('CurrentStack.md')) ? this.rootPath : persistencePath;
                                this.logger.info(`[StackView] Persisting stack changes to ${savePath} (Debounced)`);
                                await this.persistenceService.saveStack(tasks, savePath);
                                this.lastSavedIds = currentIds;
                                this.saveTimeout = null;
                            }, 500);
                        }
                    }
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

                            nodeToInsert = await this.onTaskCreate(result.title, options);
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
                openDurationPicker: (index: number) => {
                    new DurationPickerModal(this.app, async (minutes: number) => {
                        if (this.component) {
                            const controller = this.component.getController();
                            if (controller) {
                                const cmd = new SetDurationCommand(controller, index, minutes);
                                await this.historyManager.executeCommand(cmd);

                                if (this.component.update) {
                                    this.component.update();
                                }
                            }
                        }
                    }).open();
                },
                onExport: async () => {
                    const tasks = this.getTasks();
                    const exportService = new ExportService();
                    const content = exportService.formatExport(tasks);

                    if (this.settings.exportFolder) {
                        try {
                            const fileName = `Export-${moment().format('YYYY-MM-DD-HHmm')}.md`;
                            const folderPath = this.settings.exportFolder.endsWith('/') ? this.settings.exportFolder : this.settings.exportFolder + '/';
                            const fullPath = folderPath + fileName;
                            await this.app.vault.create(fullPath, content);
                            new (window as any).Notice(`Export saved to ${fullPath}`);
                        } catch (err) {
                            console.error('Export failed:', err);
                            new (window as any).Notice('Failed to save export file.');
                        }
                    } else {
                        new (window as any).Notice('Please configure an Export Folder in settings.');
                    }
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

                            this.lastSavedIds = this.tasks.map(t => `${t.id}:${t.status}`);

                            // New stack starts with focus at 0
                            if (this.component.setFocus) {
                                this.logger.info(`[StackView] Calling component.setFocus(0)`);
                                this.component.setFocus(0);
                            }
                        } else {
                            this.logger.warn(`[StackView] WARNING: component or component.setTasks is undefined!`);
                        }

                        // Update leaf state for history
                        await this.leaf.setViewState({
                            type: VIEW_TYPE_STACK,
                            state: this.getState()
                        }, { history: true });

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

                            this.lastSavedIds = this.tasks.map(t => `${t.id}:${t.status}`);

                            if (this.component.setFocus) {
                                this.logger.info(`[StackView] Calling component.setFocus(${focusedIndex})`);
                                this.component.setFocus(focusedIndex);
                            }
                        } else {
                            this.logger.warn(`[StackView] WARNING: component or component.setTasks is undefined!`);
                            this.logger.warn(`[StackView]   - component exists: ${!!this.component}`);
                            this.logger.warn(`[StackView]   - component.setTasks exists: ${!!(this.component && this.component.setTasks)}`);
                        }

                        // Update leaf state for history
                        await this.leaf.setViewState({
                            type: VIEW_TYPE_STACK,
                            state: this.getState()
                        }, { history: true });

                        this.logger.info(`[StackView] Go back completed. Restored focus to ${focusedIndex}`);
                    } else {
                        this.logger.warn(`[StackView] Cannot go back. Result success: ${success}`);
                    }
                    this.logger.info(`[StackView] ========== GO BACK FINISHED ==========`);
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
        if (this.saveTimeout) {
            window.clearTimeout(this.saveTimeout);
        }
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
