import { Plugin, PluginSettingTab, App, Setting, WorkspaceLeaf, TFolder, TFile, Platform, Notice } from 'obsidian';
import { DumpView, VIEW_TYPE_DUMP } from './views/DumpView.js';
import { TriageView, VIEW_TYPE_TRIAGE } from './views/TriageView.js';
import { StackView, VIEW_TYPE_STACK } from './views/StackView.js';
import { type TaskNode } from './scheduler.js';
import { parseTitleFromFilename, updateMetadataField, generateFilename, serializeStackToMarkdown } from './persistence.js';
import { GraphBuilder } from './GraphBuilder.js';
import moment from 'moment';
import { HistoryManager } from './history.js';
import { NavigationManager } from './navigation/NavigationManager.js';
import { ExportService } from './services/ExportService.js';
import { SyncService } from './services/SyncService.js';
import { ShakeDetector } from './utils/ShakeDetector.js';
import { registerCommands } from './commands/CommandRegistry.js';
import { HandoffOrchestrator } from './services/HandoffOrchestrator.js';
import { StackPersistenceService } from './services/StackPersistenceService.js';
import { ProcessGovernor } from './services/ProcessGovernor.js';

import { type TodoFlowSettings, DEFAULT_SETTINGS } from './settings.js';
import { DEFAULT_KEYBINDINGS } from './keybindings.js';
import { formatKeys, parseKeys } from './utils/settings-utils.js';

import { FileLogger } from './logger.js';

import { ViewManager } from './ViewManager.js';
import { TodoFlowSettingTab } from './TodoFlowSettingTab.js';

export default class TodoFlowPlugin extends Plugin {
    settings!: TodoFlowSettings;
    historyManager!: HistoryManager;
    logger!: FileLogger;
    viewManager!: ViewManager;
    handoffOrchestrator!: HandoffOrchestrator;
    shakeDetector?: ShakeDetector;
    stackPersistenceService!: StackPersistenceService;
    governor!: ProcessGovernor;
    isSyncing: boolean = false;

    get isMobile() {
        // @ts-ignore
        return Platform.isMobile || (typeof window !== 'undefined' && (window as any).WDIO_MOBILE_MOCK);
    }

    async onload() {
        console.log('[Todo Flow] Plugin Loading...');

        await this.loadSettings();
        this.historyManager = new HistoryManager();
        const logPath = this.settings.absoluteLogPath || 'logs/todo-flow.log';
        this.logger = new FileLogger(this.app, this.settings.debug, logPath);
        this.viewManager = new ViewManager(this.app, this.logger);
        this.stackPersistenceService = new StackPersistenceService(this.app);
        this.stackPersistenceService.setLogger(this.logger);

        this.handoffOrchestrator = new HandoffOrchestrator(
            this.app,
            this.settings,
            this.historyManager,
            this.logger,
            this.viewManager,
            this.stackPersistenceService,
            (data) => this.saveData(data)
        );

        this.governor = ProcessGovernor.getInstance(this.app, this.logger);

        const buildId = typeof process !== 'undefined' ? (process.env as any).BUILD_ID : 'unknown';
        await this.logger.info(`[Todo Flow] Loading v${this.manifest.version} (Build ${buildId})`);
        console.log('[Todo Flow] Logger initialized');

        // Watch for external modifications via Metadata Cache (more stable than vault.modify)
        this.registerEvent(
            this.app.metadataCache.on('changed', async (file) => {
                if (!(file instanceof TFile)) return;

                // Reactive Update: Notify all Stack Views to refresh if their data might have changed
                this.app.workspace.getLeavesOfType(VIEW_TYPE_STACK).forEach(leaf => {
                    if (leaf.view instanceof StackView) {
                        leaf.view.requestUpdate();
                    }
                });

                if (this.settings.traceVaultEvents) {
                    try {
                        await this.logger.info(`[main] MetadataCache Changed: ${file.path}`);
                        if (!(await this.app.vault.adapter.exists('logs'))) {
                            await this.app.vault.adapter.mkdir('logs');
                        }
                        await this.app.vault.adapter.write('logs/modify-detected.txt', `Detected ${file.path} at ${new Date().toISOString()}`);
                    } catch (e) { }
                }
            })
        );

        this.addSettingTab(new TodoFlowSettingTab(this.app, this));

        this.app.workspace.onLayoutReady(() => {
            this.logger.info('[Todo Flow] Workspace layout is READY.');
        });

        // ... (views registration) ...
        console.log('[Todo Flow] Registering Views...');

        this.registerView(
            VIEW_TYPE_DUMP,
            (leaf) => new DumpView(leaf, this.settings, this.logger, async (tasks) => {
                return this.activateTriage(tasks);
            })
        );

        this.registerView(
            VIEW_TYPE_TRIAGE,
            (leaf) => new TriageView(leaf, [], this.settings, this.historyManager, this.logger, this.viewManager, (results: { shortlist: TaskNode[], notNow: TaskNode[] }) => {
                this.logger.info(`Triage complete: ${JSON.stringify(results)}`);
                // Auto-start Stack after Triage (Workflow)
                // @ts-ignore
                this.app.commands.executeCommandById('todo-flow:open-daily-stack');
            }, (title: string, options: any) => {
                return this.onCreateTask(title, options);
            }, this.stackPersistenceService, null)
        );

        this.registerView(
            VIEW_TYPE_STACK,
            (leaf) => {
                return new StackView(leaf, this.settings, this.historyManager, this.logger, this.viewManager, this.stackPersistenceService, (task: TaskNode) => {
                    return this.syncTaskToNote(task);
                }, (title: string, options: any) => {
                    return this.onCreateTask(title, options);
                });
            }
        );

        // Register ViewManager events
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', async (leaf) => {
                await this.viewManager.handleActiveLeafChange(leaf);
            })
        );

        // Initial sovereignty capture
        this.viewManager.handleActiveLeafChange();


        registerCommands(this);

        if (this.settings.enableShake) {
            this.initShakeDetector();
        }
    }

    private initShakeDetector() {
        if (this.shakeDetector) {
            this.shakeDetector.stop();
        }
        this.shakeDetector = new ShakeDetector(() => {
            this.logger.info('[Shake] Shake detected! Triggering undo.');
            this.historyManager.undo();
            new (window as any).Notice('Undo (Shake)');
        });
        this.shakeDetector.start();
    }

    async activateView(viewType: string, props?: any) {
        return this.handoffOrchestrator.activateView(viewType, props);
    }

    async activateTriage(tasks: TaskNode[]) {
        return this.handoffOrchestrator.activateTriage(tasks);
    }

    async activateStack(input: string | string[], backingFile?: string) {
        return this.handoffOrchestrator.activateStack(input, backingFile);
    }

    refreshStackView() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_STACK);
        leaves.forEach(leaf => {
            if (leaf.view instanceof StackView) {
                leaf.view.updateSettings(this.settings);
            }
        });
    }

    setIsSyncing(val: boolean) {
        this.isSyncing = val;
        this.logger.info(`[main] Sync status updated: ${val}`);
        if (this.settings.debug) new (window as any).Notice(`Sync Guard: ${val ? 'ACTIVATED' : 'DEACTIVATED'}`);

        // Propagate to all active Stack Views
        this.app.workspace.getLeavesOfType(VIEW_TYPE_STACK).forEach(leaf => {
            if (leaf.view.getViewType() === VIEW_TYPE_STACK && typeof (leaf.view as any).setIsSyncing === 'function') {
                (leaf.view as any).setIsSyncing(val);
            }
        });
    }

    async loadSettings() {
        const loadedData = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
        // Ensure keys object is also merged if it exists to pick up new defaults
        if (loadedData && loadedData.keys) {
            this.settings.keys = Object.assign({}, DEFAULT_KEYBINDINGS, loadedData.keys);

            // --- Migration / Cleanup Logic ---

            // 1. Remove 'e' from Export if present (fixes Rename collision)
            const exportKeys = this.settings.keys.export;
            if (Array.isArray(exportKeys) && exportKeys.includes('e')) {
                this.settings.keys.export = exportKeys.filter(k => k !== 'e');
                // Ensure we have a valid export key
                if (!this.settings.keys.export.includes('Shift+E')) {
                    this.settings.keys.export.push('Shift+E');
                }
                console.log('[Todo Flow] Migrated settings: Removed "e" from export keys to fix collision with Rename.');
            }

            // 2. Remove 'Backspace' from GoBack if present (fixes Delete collision)
            const goBackKeys = this.settings.keys.goBack;
            if (Array.isArray(goBackKeys) && goBackKeys.includes('Backspace')) {
                this.settings.keys.goBack = goBackKeys.filter(k => k !== 'Backspace');
                console.log('[Todo Flow] Migrated settings: Removed "Backspace" from goBack keys to fix collision with DeleteTask.');
            }

            // 3. Enforce Corrected Keybinding Layout (User Request 2026-01-26)
            // If anchor is ['a', 'Shift+A'] (from my previous mistake), reset everything to new defaults.
            if (this.settings.keys.anchor.includes('a') && this.settings.keys.confirm.includes('f')) {
                this.settings.keys = Object.assign({}, DEFAULT_KEYBINDINGS);
                console.log('[Todo Flow] Migrated settings to final corrected "dfjk" + Duration layout.');
            }

            console.log('[Todo Flow] Final resolved keys:', this.settings.keys);
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async syncTaskToNote(task: TaskNode) {
        return this.handoffOrchestrator.syncTaskToNote(task);
    }

    async onCreateTask(title: string, options?: { startTime?: moment.Moment | undefined, duration?: number | undefined, isAnchored?: boolean | undefined, parentPath?: string | undefined }): Promise<TaskNode> {
        return this.handoffOrchestrator.onCreateTask(title, options);
    }

    async getTasksFromFolder(folderPath: string): Promise<TaskNode[]> {
        return this.handoffOrchestrator.getTasksFromFolder(folderPath);
    }
}

