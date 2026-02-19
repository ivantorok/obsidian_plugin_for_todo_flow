import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import type { Modifier } from 'obsidian';
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
import { StackPersistenceService } from '../services/StackPersistenceService.js';
import { DurationPickerModal } from '../ui/DurationPickerModal.js';
import { ExportService } from '../services/ExportService.js';
import { SetDurationCommand } from '../commands/stack-commands.js';
import moment from 'moment';
import { type ViewManager } from '../ViewManager.js';
import { type StackUIState } from './ViewTypes.js';

export const VIEW_TYPE_STACK = "todo-flow-stack-view";

export class StackView extends ItemView {
    component: any;
    rootPath: string | null = null;
    parentTaskName: string | null = null;
    private currentTaskIds: string[] | null = null;
    tasks: TaskNode[] = [];
    settings: TodoFlowSettings;
    historyManager: HistoryManager;
    logger: FileLogger;
    onTaskUpdate: (task: TaskNode) => void | Promise<void>;
    onTaskCreate: (title: string, options?: { startTime?: moment.Moment | undefined, duration?: number | undefined, isAnchored?: boolean | undefined, parentPath?: string | undefined }) => Promise<TaskNode>;
    loader: StackLoader;
    navManager: NavigationManager;
    persistenceService: StackPersistenceService;
    viewManager: ViewManager;
    private lastSavedIds: string[] = [];
    private saveTimeout: number | null = null;
    private flushResolvers: (() => void)[] = [];
    private persistenceLockCount: number = 0;
    private isSyncing: boolean = false;
    private syncCheckInterval: number | null = null;

    setIsSyncing(val: boolean) {
        this.isSyncing = val;
        if (this.component) {
            // @ts-ignore
            this.component.setIsSyncing(val);
        }
    }

    requestUpdate() {
        this.reload();
    }

    constructor(leaf: WorkspaceLeaf, settings: TodoFlowSettings, historyManager: HistoryManager, logger: FileLogger, viewManager: ViewManager, persistenceService: StackPersistenceService, onTaskUpdate: (task: TaskNode) => void | Promise<void>, onTaskCreate: (title: string, options?: { startTime?: moment.Moment | undefined, duration?: number | undefined, isAnchored?: boolean | undefined, parentPath?: string | undefined }) => Promise<TaskNode>) {
        super(leaf);
        this.settings = settings;
        this.historyManager = historyManager;
        this.logger = logger;
        this.viewManager = viewManager;
        this.persistenceService = persistenceService;
        this.onTaskUpdate = onTaskUpdate;
        this.onTaskCreate = onTaskCreate;
        this.navigation = true; // Enable Obsidian native back/forward buttons

        // Initialize navigation services
        this.loader = new StackLoader(this.app, this.logger);
        this.navManager = new NavigationManager(
            this.app,
            this.loader,
            this.persistenceService,
            (tasks) => computeSchedule(tasks, moment())
        );

        // Listen for centralized state changes
        this.navManager.onStackChange((state) => {
            if (this.logger) this.logger.info(`[StackView] State change detected in NavigationManager. Updating view.`);
            this.tasks = state.currentStack;
            this.rootPath = state.currentSource;
            this.parentTaskName = this.resolveParentName(this.rootPath);

            if (this.component) {
                const uiState: StackUIState = {
                    tasks: this.tasks,
                    focusedIndex: state.currentFocusedIndex ?? 0,
                    parentTaskName: this.parentTaskName,
                    canGoBack: this.navManager.canGoBack(),
                    rootPath: this.rootPath,
                    isMobile: (this.app as any).isMobile
                };

                if (this.logger) this.logger.info(`[StackView] Pushing atomic navState: tasks=${uiState.tasks.length}, focus=${uiState.focusedIndex}, parent=${uiState.parentTaskName}`);

                // Single source of truth update
                if (this.component.setNavState) {
                    this.component.setNavState(uiState);
                }
            }
        });

        // Sync Sentry: Monitor Obsidian Sync status
        this.setupSyncSentry();

        // Reactive Sync: Listen for external task file changes
        this.registerEvent(this.app.metadataCache.on('changed', async (file) => {
            if (!(file instanceof TFile)) return;

            // If the changed file is in our current stack, re-parse it
            const taskIndex = this.tasks.findIndex(t => t.id === file.path);
            if (taskIndex !== -1) {
                if (this.logger) this.logger.info(`[StackView] External change detected for ${file.path}. Re-parsing metadata.`);
                const metadata = await this.loader.parser.resolveTaskMetadata(file.path);
                if (metadata) {
                    const task = this.tasks[taskIndex]!;
                    // Update our in-memory task with new disk values
                    Object.assign(task, metadata);
                    (task as any)._loadedAt = Date.now(); // Update mtime guard anchor

                    if (this.component && this.component.update) {
                        this.component.update();
                    }
                }
            }
        }));
    }

    private setupSyncSentry() {
        const checkSync = () => {
            const syncPlugin = (this.app as any).internalPlugins?.getPluginById('sync');
            const isActive = syncPlugin?.instance?.status === 'syncing' ||
                syncPlugin?.instance?.status === 'downloading' ||
                syncPlugin?.instance?.status === 'uploading';

            if (isActive !== this.isSyncing) {
                this.isSyncing = isActive;
                if (this.component && this.component.setIsSyncing) {
                    this.component.setIsSyncing(this.isSyncing);
                }
            }
        };

        // Poll every 2 seconds for sync status
        this.syncCheckInterval = window.setInterval(checkSync, 2000);
        checkSync();
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

    getState(isNavigation: boolean = false): Record<string, unknown> {
        const navState = this.navManager.getState();
        const state: Record<string, unknown> = {
            rootPath: this.rootPath,
            navState: navState
        };
        // If it's a navigation act, we want to ensure Obsidian sees it as a new distinct state
        if (isNavigation) {
            state.ts = Date.now();
        }
        return state;
    }

    async setState(state: any, result: any): Promise<void> {
        const now = this.getNow();
        if (state && (state.rootPath || state.ids)) {
            let rawTasks: TaskNode[] = [];

            // Case 1: Restore from full Navigation History
            const hasHistory = state.navState?.history && state.navState.history.length > 0;
            const hasStack = state.navState?.currentStack && state.navState.currentStack.length > 0;

            // SAFETY: If we have navigation history but the current stack is empty,
            // this suggests we're restoring a drilled-down state. However, if this happens
            // at workspace load (not after explicit user navigation), it's likely stale state
            // from a previous session/test. Force a refresh instead.
            const suspiciousState = hasHistory && !hasStack;
            const shouldForceRefresh = state.navState?.forceRefresh || suspiciousState;

            if (state.navState && (hasHistory || hasStack) && !shouldForceRefresh) {
                if (this.logger && suspiciousState) {
                    await this.logger.warn(`[StackView] REJECTING SUSPICIOUS STATE: history=${state.navState.history.length}, stack=${state.navState.currentStack?.length || 0}`);
                }

                this.navManager.setState(state.navState);
                this.tasks = this.navManager.getCurrentStack();
                this.rootPath = state.rootPath || state.navState.currentSource;
                this.parentTaskName = this.resolveParentName(this.rootPath);

                if (this.logger) await this.logger.info(`[StackView] Restoration success. Root: ${this.rootPath}, Parent: ${this.parentTaskName}`);

                if (this.component && this.component.setNavState) {
                    const uiState: StackUIState = {
                        tasks: this.tasks,
                        focusedIndex: state.navState.currentFocusedIndex ?? 0,
                        parentTaskName: this.parentTaskName,
                        canGoBack: this.navManager.canGoBack(),
                        rootPath: this.rootPath,
                        isMobile: (this.app as any).isMobile
                    };
                    this.component.setNavState(uiState);
                }
                return;
            }

            // Case 2: Standard Load
            if (this.logger) await this.logger.info(`[StackView] Loading from DISK (Case 2). rootPath=${state.rootPath}, backingFile=${this.settings.targetFolder}/CurrentStack.md`);

            if (state.rootPath === 'QUERY:SHORTLIST') {
                rawTasks = await this.loader.loadShortlisted();
                this.rootPath = 'QUERY:SHORTLIST';
            } else if (state.ids && Array.isArray(state.ids)) {
                this.currentTaskIds = state.ids;
                rawTasks = await this.loader.loadSpecificFiles(state.ids);
                this.rootPath = state.rootPath || `EXPLICIT:${state.ids.length}`;
            } else {
                this.rootPath = state.rootPath;
                if (this.logger) this.logger.info(`[StackView] Loading path: ${this.rootPath}`);
                rawTasks = await this.loader.load(state.rootPath);
            }

            this.parentTaskName = this.resolveParentName(this.rootPath);

            if (this.logger) this.logger.info(`[StackView] Raw tasks loaded: ${rawTasks?.length || 0}. Any children? ${rawTasks?.some(t => t.children && t.children.length > 0) || false}`);

            if (this.logger) this.logger.info(`[StackView] Raw tasks loaded: ${rawTasks?.length || 0}`);

            const initialTasks = computeSchedule(rawTasks || [], now);
            this.navManager.setStack(initialTasks, this.rootPath!);

            const persistencePath = `${this.settings.targetFolder}/CurrentStack.md`;
            // 3. Save & Activate
            try {
                await this.persistenceService.saveStack(
                    this.navManager.getCurrentStack(), persistencePath);
                this.lastSavedIds = this.navManager.getCurrentStack().map(t => `${t.id}:${t.status}`);
            } catch (e) {
                if (this.logger) this.logger.error(`[StackView] Failed to save CurrentStack.md: ${e}`);
            }
        }

        await super.setState(state, result);
    }

    openAddModal() {
        this.isModalOpen = true;
        const modal = new QuickAddModal(this.app, async (result: any) => {
            let newNode: TaskNode | null = null;

            if (result.type === 'new') {
                if (this.logger) this.logger.info(`[StackView] (openAddModal) Creating new task "${result.title}" with rootPath: ${this.rootPath}`);
                newNode = await this.onTaskCreate(result.title, {
                    duration: 30,
                    parentPath: this.rootPath?.endsWith('.md') ? this.rootPath : undefined
                });
            } else if (result.type === 'file' && result.file) {
                const file = result.file;
                newNode = {
                    id: file.path,
                    title: parseTitleFromFilename(file.name),
                    duration: 30,
                    status: 'todo' as const,
                    isAnchored: false,
                    children: []
                };
                // ATOMIC FILE MODE: Allow drilling into empty files (creating a new stack)
                // if (children.length === 0) {
                //     return false;
                // }
                const metadata = await this.loader.parser.resolveTaskMetadata(file.path);
                if (metadata) {
                    newNode = { ...newNode, ...metadata } as TaskNode;
                }
            }

            if (newNode) {
                this.tasks.unshift(newNode);
                this.navManager.setStack(this.tasks, this.rootPath!);
                if (this.component && this.component.setTasks) {
                    this.component.setTasks(this.tasks);
                }
                const persistencePath = `${this.settings.targetFolder}/CurrentStack.md`;
                if (this.rootPath === persistencePath || this.rootPath === 'CurrentStack.md' || (this.currentTaskIds && this.currentTaskIds.length > 0)) {
                    await this.persistenceService.saveStack(this.tasks, 'CurrentStack.md');
                }
                this.app.workspace.requestSaveLayout();
            }
            this.app.workspace.requestSaveLayout();
        }, VIEW_TYPE_STACK);

        const originalOnClose = modal.onClose.bind(modal);
        modal.onClose = () => {
            this.lastModalCloseTime = Date.now();
            originalOnClose();
            setTimeout(() => { this.isModalOpen = false; }, 500);
        };
        modal.open();
    }

    async reload(force: boolean = false): Promise<void> {
        if (this.logger) await this.logger.info(`[StackView] Reload triggered (force=${force}). Calling flushPersistence and navManager.refresh(). NOW=${Date.now()}`);
        await this.flushPersistence();
        await this.navManager.refresh();
    }

    async flushPersistence(): Promise<void> {
        if (!this.saveTimeout) return;
        this.logger.info(`[StackView] Flush requested.`);

        // If locked, we MUST clear the lock or wait. 
        // For flush, we force immediate execution by clearing the timeout.
        if (this.saveTimeout) {
            window.clearTimeout(this.saveTimeout);
            await this.performSave();
        }

        return new Promise((resolve) => {
            this.flushResolvers.push(resolve);
            // If nothing was pending after performSave, resolve now
            if (!this.saveTimeout) {
                const resolvers = [...this.flushResolvers];
                this.flushResolvers = [];
                resolvers.forEach(res => res());
            }
        });
    }

    /**
     * Lock persistence during active user interaction (swiping/dragging)
     * to prevent UI jank from disk I/O.
     */
    public lockPersistence() {
        this.persistenceLockCount++;
        if (this.logger && this.settings.debug) this.logger.info(`[StackView] Persistence LOCKED (count: ${this.persistenceLockCount})`);
    }

    /**
     * Unlock persistence and trigger a save if one was pending.
     */
    public unlockPersistence() {
        this.persistenceLockCount = Math.max(0, this.persistenceLockCount - 1);
        if (this.logger && this.settings.debug) this.logger.info(`[StackView] Persistence UNLOCKED (count: ${this.persistenceLockCount})`);

        if (this.persistenceLockCount === 0 && this.saveTimeout) {
            // Re-trigger the debounced save immediately now that interaction is done
            if (this.logger && this.settings.debug) this.logger.info(`[StackView] interaction-idle: triggering pending save`);
            this.triggerSave(0); // Immediate but still via triggerSave for consistency
        }
    }

    private async performSave() {
        if (!this.lastTasksForSave) return;
        const tasks = this.lastTasksForSave;
        const currentIds = tasks.map(t => `${t.id}:${t.status}`);
        const persistencePath = `${this.settings.targetFolder}/CurrentStack.md`;
        const savePath = (this.rootPath && this.rootPath.includes('CurrentStack.md')) ? this.rootPath : persistencePath;

        try {
            await this.persistenceService.saveStack(tasks, savePath);
            this.lastSavedIds = currentIds;
        } finally {
            this.saveTimeout = null;
            this.lastTasksForSave = null;
            const resolvers = [...this.flushResolvers];
            this.flushResolvers = [];
            resolvers.forEach(resolve => resolve());
        }
    }

    private lastTasksForSave: TaskNode[] | null = null;
    private triggerSave(delay: number = 500) {
        if (this.saveTimeout) window.clearTimeout(this.saveTimeout);

        this.saveTimeout = window.setTimeout(async () => {
            if (this.persistenceLockCount > 0) {
                if (this.logger && this.settings.debug) this.logger.info(`[StackView] Save deferred: active interaction lock`);
                return; // Will be re-triggered by unlockPersistence
            }
            await this.performSave();
        }, delay);
    }

    private isModalOpen: boolean = false;
    private lastModalCloseTime: number = 0;

    async onOpen() {
        // Strict Centralized Sovereignty check
        this.registerDomEvent(window, 'keydown', (e: KeyboardEvent) => {
            if (!this.viewManager.isSovereign((this.leaf as any).id)) return;

            // Robust check: Ignore if typing in an input/textarea/contentEditable
            const target = e.target as HTMLElement;
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable) {
                return;
            }

            if (e.defaultPrevented) return;

            // Block keys if modal is open OR was recently closed (prevent leak)
            const timeSinceClose = Date.now() - this.lastModalCloseTime;
            if (this.isModalOpen || timeSinceClose < 500) {
                if (this.logger) this.logger.info(`[StackView] Key blocked: ${e.key} (ModalOpen: ${this.isModalOpen}, TimeSinceClose: ${timeSinceClose})`);
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

        // Ensure container is focusable
        this.containerEl.tabIndex = 0;
        this.contentEl.focus();

        this.registerInterval(
            window.setInterval(() => {
                if (this.component && this.component.updateNow) {
                    this.component.updateNow(this.getNow());
                }
            }, 60 * 1000)
        );

        // Initialize state via setState (Obsidian internal lifecycle)
        // We removed this.reload() from here to prevent BUG-022 where an immediate
        // disk refresh would overwrite the triaged memory state during handoff.

        if (this.settings.debug) {
            console.log('[StackView] Mounting Svelte component...');
            if (this.logger) this.logger.info(`[StackView] Mounting Svelte Component. Tasks=${this.tasks.length}`);
        }
        try {
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
                    canGoBack: this.navManager.canGoBack(),
                    parentTaskName: this.parentTaskName,
                    isMobile: (this.app as any).isMobile,
                    debug: this.settings.debug,
                    navState: {
                        tasks: this.tasks,
                        focusedIndex: this.navManager.getState().currentFocusedIndex,
                        parentTaskName: this.parentTaskName,
                        canGoBack: this.navManager.canGoBack(),
                        rootPath: this.rootPath,
                        isMobile: (this.app as any).isMobile
                    } as StackUIState,
                    onFocusChange: (index: number) => {
                        if (this.logger) this.logger.info(`[StackView] Focus change from UI: ${index}`);
                        this.navManager.setFocus(index);
                    },
                    onStackChange: (tasks: TaskNode[]) => {
                        this.tasks = tasks;
                        this.navManager.setStack(tasks, this.rootPath!);
                        this.app.workspace.requestSaveLayout();

                        const persistencePath = `${this.settings.targetFolder}/CurrentStack.md`;
                        if (this.rootPath === persistencePath || this.rootPath === 'CurrentStack.md' || (this.currentTaskIds && this.currentTaskIds.length > 0)) {
                            if (tasks.length === 0 && (!this.lastSavedIds || this.lastSavedIds.length === 0)) return;
                            const currentIds = tasks.map(t => `${t.id}:${t.status}`);
                            const idsChanged = JSON.stringify(currentIds) !== JSON.stringify(this.lastSavedIds);

                            if (idsChanged) {
                                this.lastTasksForSave = tasks;
                                this.triggerSave(500);
                            }
                        }
                    },
                    openQuickAddModal: (currentIndex: number) => {
                        this.isModalOpen = true;
                        const modal = new QuickAddModal(this.app, async (result) => {
                            let nodeToInsert: TaskNode | null = null;
                            if (result.type === 'new' && result.title) {
                                const options: { startTime?: moment.Moment, duration?: number, isAnchored?: boolean, parentPath?: string | undefined } = {};
                                if (result.startTime) options.startTime = result.startTime;
                                if (result.duration !== undefined) options.duration = result.duration;
                                if (result.isAnchored !== undefined) options.isAnchored = result.isAnchored;

                                if (this.logger) this.logger.info(`[StackView] (openQuickAddModal prop) Creating new task "${result.title}" with rootPath: ${this.rootPath}`);
                                options.parentPath = this.rootPath?.endsWith('.md') ? this.rootPath : undefined;

                                nodeToInsert = await this.onTaskCreate(result.title, options);
                            } else if (result.type === 'file' && result.file) {
                                const nodes = await this.loader.loadSpecificFiles([result.file.path]);
                                if (nodes.length > 0) nodeToInsert = nodes[0]!;
                            }

                            if (nodeToInsert && this.component) {
                                const controller = this.component.getController();
                                if (controller) {
                                    const cmd = new InsertTaskCommand(controller, currentIndex, nodeToInsert);
                                    await this.historyManager.executeCommand(cmd);
                                    if (this.component.update) {
                                        this.component.update();
                                        if (cmd.resultIndex !== null) this.component.setFocus(cmd.resultIndex);
                                    }
                                }
                            }
                        }, VIEW_TYPE_STACK);

                        const originalOnClose = modal.onClose.bind(modal);
                        modal.onClose = () => {
                            this.lastModalCloseTime = Date.now();
                            originalOnClose();
                            setTimeout(() => { this.isModalOpen = false; }, 500);
                        };
                        modal.open();
                    },
                    openDurationPicker: (index: number) => {
                        this.isModalOpen = true;
                        const modal = new DurationPickerModal(this.app, async (minutes: number) => {
                            if (this.component) {
                                const controller = this.component.getController();
                                if (controller) {
                                    const cmd = new SetDurationCommand(controller, index, minutes);
                                    await this.historyManager.executeCommand(cmd);
                                    if (this.component.update) this.component.update();
                                }
                            }
                        });

                        const originalOnClose = modal.onClose.bind(modal);
                        modal.onClose = () => {
                            this.lastModalCloseTime = Date.now();
                            originalOnClose();
                            setTimeout(() => { this.isModalOpen = false; }, 500);
                        };
                        modal.open();
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
                                new (window as any).Notice('Failed to save export file.');
                            }
                        } else {
                            new (window as any).Notice('Please configure an Export Folder in settings.');
                        }
                    },
                    onOpenFile: (path: string) => {
                        this.app.workspace.openLinkText(path, '', true);
                    },
                    onNavigate: this.onNavigate.bind(this),
                    onGoBack: async () => {
                        const result = await this.navManager.goBack();
                        if (result.success) {
                            this.tasks = this.navManager.getCurrentStack();
                            this.rootPath = this.navManager.getState().currentSource;
                            this.parentTaskName = this.resolveParentName(this.rootPath);
                            if (this.component && this.component.setNavState) {
                                const uiState: StackUIState = {
                                    tasks: this.tasks,
                                    focusedIndex: result.focusedIndex,
                                    parentTaskName: this.parentTaskName,
                                    canGoBack: this.navManager.canGoBack(),
                                    rootPath: this.rootPath,
                                    isMobile: (this.app as any).isMobile
                                };
                                this.component.setNavState(uiState);
                            }
                            await this.leaf.setViewState({ type: VIEW_TYPE_STACK, state: this.getState() }, { history: true } as any);
                        }
                    },
                    lockPersistence: () => this.lockPersistence(),
                    unlockPersistence: () => this.unlockPersistence(),
                    isSyncing: this.isSyncing,
                    onSyncStatusChange: (isSyncing: boolean) => {
                        this.isSyncing = isSyncing;
                        if (this.logger) this.logger.info(`[StackView] Sync status changed: ${isSyncing}`);
                    },
                    onMetadataCacheChange: async () => {
                        if (this.logger) this.logger.info(`[StackView] Metadata cache changed. Reloading tasks.`);
                        await this.reload(true); // Force reload from disk
                    }
                }
            });
            if (this.settings.debug) console.log('[StackView] Svelte component mounted successfully');
        } catch (e) {
            console.error('[StackView] Failed to mount Svelte component:', e);
            this.contentEl.createEl('div', { text: 'Failed to load Daily Stack view. Check console for details.', cls: 'error-msg' });
        }
    }

    private getNow(): moment.Moment {
        if (this.settings.timingMode === 'fixed' && this.settings.fixedStartTime) {
            const [hh, mm] = this.settings.fixedStartTime.split(':');
            return moment().set({ hour: parseInt(hh || '9'), minute: parseInt(mm || '0'), second: 0, millisecond: 0 });
        }
        return moment();
    }

    async onNavigate(path: string, currentFocus: number) {
        this.logger.info(`[StackView] onNavigate entry: ${path}`);
        const success = await this.navManager.drillDown(path, currentFocus);
        if (success) {
            this.tasks = this.navManager.getCurrentStack();
            this.rootPath = this.navManager.getState().currentSource;
            this.parentTaskName = this.resolveParentName(this.rootPath);
            if (this.logger) this.logger.info(`[StackView] onNavigate success. New rootPath: ${this.rootPath}, New parentTaskName: ${this.parentTaskName}`);

            if (this.component && this.component.setNavState) {
                const uiState: StackUIState = {
                    tasks: this.tasks,
                    focusedIndex: 0,
                    parentTaskName: this.parentTaskName,
                    canGoBack: this.navManager.canGoBack(),
                    rootPath: this.rootPath,
                    isMobile: (this.app as any).isMobile
                };
                this.component.setNavState(uiState);
            }

            if (this.logger) this.logger.info(`[StackView] Pushing state to Obsidian for path: ${path}. History Depth: ${this.navManager.getState().history.length}`);
            // Pass { history: true } as eState - Obsidian runtime often looks for this
            await this.leaf.setViewState({ type: VIEW_TYPE_STACK, state: this.getState(true), active: true }, { history: true } as any);
            if (this.logger) this.logger.info(`[StackView] State push completed.`);
        } else {
            if (this.logger) this.logger.warn(`[StackView] drillDown FAILED for path: ${path}. No fallback applied.`);
        }
    }

    updateSettings(settings: TodoFlowSettings) {
        this.settings = settings;
        if (this.component) {
            if (this.component.updateSettings) this.component.updateSettings(this.settings);
            if (this.component.updateNow) this.component.updateNow(this.getNow());
        }
    }

    async onClose() {
        if (this.saveTimeout) window.clearTimeout(this.saveTimeout);
        if (this.syncCheckInterval) window.clearInterval(this.syncCheckInterval);
        if (this.navManager) this.navManager.destroy();
        if (this.component) unmount(this.component);
    }

    getController() {
        if (this.component && this.component.getController) return this.component.getController();
        return null;
    }

    onActivate() {
        this.contentEl.focus();
    }

    onResize() {
        if (this.component && this.component.setIsMobile) {
            this.component.setIsMobile((this.app as any).isMobile);
        }
    }

    refreshMobileDetection() {
        if (this.component && this.component.setIsMobile) {
            this.component.setIsMobile((this.app as any).isMobile);
        }
    }

    private resolveParentName(path: string | null): string | null {
        if (!path) return null;
        if (path === 'QUERY:SHORTLIST') return 'Shortlist';
        if (path.startsWith('EXPLICIT:')) return 'Stack';

        // If it's the target folder, it's the root
        if (path === this.settings.targetFolder) return null;
        if (path === 'CurrentStack.md' || path.includes('/CurrentStack.md')) return null;

        // Try to parse from filename
        const filename = path.split('/').pop();
        if (filename) {
            const result = parseTitleFromFilename(filename).replace(/\.md$/, '');
            if (this.logger) this.logger.info(`[StackView] resolveParentName: path='${path}', result='${result}'`);
            return result;
        }
        return null;
    }
}
