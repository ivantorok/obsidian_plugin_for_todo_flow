import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
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
    onTaskCreate: (title: string, options?: { startTime?: moment.Moment | undefined, duration?: number | undefined, isAnchored?: boolean | undefined, parentPath?: string | undefined }) => Promise<TaskNode>;
    loader: StackLoader;
    navManager: NavigationManager;
    persistenceService: StackPersistenceService;
    private lastSavedIds: string[] = [];
    private saveTimeout: number | null = null;
    private flushResolvers: (() => void)[] = [];

    constructor(leaf: WorkspaceLeaf, settings: TodoFlowSettings, historyManager: HistoryManager, logger: FileLogger, persistenceService: StackPersistenceService, onTaskUpdate: (task: TaskNode) => void | Promise<void>, onTaskCreate: (title: string, options?: { startTime?: moment.Moment | undefined, duration?: number | undefined, isAnchored?: boolean | undefined, parentPath?: string | undefined }) => Promise<TaskNode>) {
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
            if (this.logger) this.logger.info(`[StackView] New rootPath from NavigationManager: ${this.rootPath}`);

            if (this.component && this.component.setTasks) {
                this.component.setTasks(this.tasks);
                if (state.currentFocusedIndex !== undefined) {
                    this.component.setFocus(state.currentFocusedIndex);
                }
            }
        });
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
                this.rootPath = state.rootPath || `EXPLICIT:${state.ids.length}`;
            } else {
                this.rootPath = state.rootPath;
                rawTasks = await this.loader.load(state.rootPath);
            }

            const initialTasks = computeSchedule(rawTasks, now);
            this.navManager.setStack(initialTasks, this.rootPath!);

            const persistencePath = `${this.settings.targetFolder}/CurrentStack.md`;
            if (this.rootPath === persistencePath || this.rootPath === 'CurrentStack.md') {
                try {
                    await this.persistenceService.saveStack(this.navManager.getCurrentStack(), persistencePath);
                    this.lastSavedIds = this.navManager.getCurrentStack().map(t => `${t.id}:${t.status}`);
                } catch (e) {
                    if (this.logger) this.logger.error(`[StackView] Failed to save CurrentStack.md: ${e}`);
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
        }).open();
    }

    async reload(): Promise<void> {
        if (this.logger) await this.logger.info(`[StackView] Reload triggered.`);
        const controller = this.getController();
        if (controller) {
            const reprocessCmd = new ReprocessTaskCommand(controller, this.onTaskUpdate);
            await reprocessCmd.execute();
        }
        await this.flushPersistence();
        await this.navManager.refresh();
    }

    async flushPersistence(): Promise<void> {
        if (!this.saveTimeout) return;
        this.logger.info(`[StackView] Flush requested.`);
        return new Promise((resolve) => {
            this.flushResolvers.push(resolve);
        });
    }

    async onOpen() {
        this.registerDomEvent(window, 'keydown', (e: KeyboardEvent) => {
            if (e.defaultPrevented) return;
            if (this.component) {
                this.component.handleKeyDown(e);
            }
        });

        this.registerInterval(
            window.setInterval(() => {
                if (this.component && this.component.updateNow) {
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

                    const persistencePath = `${this.settings.targetFolder}/CurrentStack.md`;
                    if (this.rootPath === persistencePath || this.rootPath === 'CurrentStack.md' || (this.currentTaskIds && this.currentTaskIds.length > 0)) {
                        if (tasks.length === 0 && (!this.lastSavedIds || this.lastSavedIds.length === 0)) return;
                        const currentIds = tasks.map(t => `${t.id}:${t.status}`);
                        const idsChanged = JSON.stringify(currentIds) !== JSON.stringify(this.lastSavedIds);

                        if (idsChanged) {
                            if (this.saveTimeout) window.clearTimeout(this.saveTimeout);
                            this.saveTimeout = window.setTimeout(async () => {
                                const savePath = (this.rootPath && this.rootPath.includes('CurrentStack.md')) ? this.rootPath : persistencePath;
                                try {
                                    await this.persistenceService.saveStack(tasks, savePath);
                                    this.lastSavedIds = currentIds;
                                } finally {
                                    this.saveTimeout = null;
                                    const resolvers = [...this.flushResolvers];
                                    this.flushResolvers = [];
                                    resolvers.forEach(resolve => resolve());
                                }
                            }, 500);
                        }
                    }
                },
                openQuickAddModal: (currentIndex: number) => {
                    new QuickAddModal(this.app, async (result) => {
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
                    }).open();
                },
                openDurationPicker: (index: number) => {
                    new DurationPickerModal(this.app, async (minutes: number) => {
                        if (this.component) {
                            const controller = this.component.getController();
                            if (controller) {
                                const cmd = new SetDurationCommand(controller, index, minutes);
                                await this.historyManager.executeCommand(cmd);
                                if (this.component.update) this.component.update();
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
                    this.logger.info(`[StackView] onNavigate entry: ${path}`);
                    const success = await this.navManager.drillDown(path, currentFocus);
                    if (success) {
                        this.tasks = this.navManager.getCurrentStack();
                        this.rootPath = this.navManager.getState().currentSource;
                        if (this.logger) this.logger.info(`[StackView] onNavigate success. New rootPath: ${this.rootPath}`);
                        if (this.component && this.component.setTasks) {
                            this.component.setTasks(this.tasks);
                            if (this.component.setFocus) this.component.setFocus(0);
                        }
                        await this.leaf.setViewState({ type: VIEW_TYPE_STACK, state: this.getState() }, { history: true });
                    }
                },
                onGoBack: async () => {
                    const result = await this.navManager.goBack();
                    if (result.success) {
                        this.tasks = this.navManager.getCurrentStack();
                        this.rootPath = this.navManager.getState().currentSource;
                        if (this.component && this.component.setTasks) {
                            this.component.setTasks(this.tasks);
                            if (this.component.setFocus) this.component.setFocus(result.focusedIndex);
                        }
                        await this.leaf.setViewState({ type: VIEW_TYPE_STACK, state: this.getState() }, { history: true });
                    }
                }
            }
        });
    }

    private getNow(): moment.Moment {
        if (this.settings.timingMode === 'fixed' && this.settings.fixedStartTime) {
            const [hh, mm] = this.settings.fixedStartTime.split(':');
            return moment().set({ hour: parseInt(hh || '9'), minute: parseInt(mm || '0'), second: 0, millisecond: 0 });
        }
        return moment();
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
        if (this.navManager) this.navManager.destroy();
        if (this.component) unmount(this.component);
    }

    getController() {
        if (this.component && this.component.getController) return this.component.getController();
        return null;
    }
}
