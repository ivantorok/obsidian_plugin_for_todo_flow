import { Plugin, PluginSettingTab, App, Setting, WorkspaceLeaf, TFolder, TFile, Platform, Notice } from 'obsidian';
import { DumpView, VIEW_TYPE_DUMP } from './views/DumpView.js';
import { TriageView, VIEW_TYPE_TRIAGE } from './views/TriageView.js';
import { StackView, VIEW_TYPE_STACK } from './views/StackView.js';
import { LeanStackView } from './views/LeanStackView.js';
import { type TaskNode } from './scheduler.js';
import { parseTitleFromFilename, updateMetadataField, generateFilename, serializeStackToMarkdown } from './persistence.js';
import { GraphBuilder } from './GraphBuilder.js';
import moment from 'moment';
import { HistoryManager } from './history.js';
import { NavigationManager } from './navigation/NavigationManager.js';
import { SmartImportService } from './services/SmartImportService.js';
import { ExportService } from './services/ExportService.js';
import { SyncService } from './services/SyncService.js';
import { ReprocessTaskCommand } from './commands/ReprocessTaskCommand.js';
import { ShakeDetector } from './utils/ShakeDetector.js';
import { StackPersistenceService } from './services/StackPersistenceService.js';

import { DEFAULT_KEYBINDINGS, type KeybindingSettings } from './keybindings.js';
import { formatKeys, parseKeys } from './utils/settings-utils.js';

export interface TodoFlowSettings {
    targetFolder: string;
    exportFolder: string;
    timingMode: 'now' | 'fixed';
    fixedStartTime: string;
    keys: KeybindingSettings;
    debug: boolean;
    enableShake: boolean;
    lastTray?: string[] | null;
    swipeLeftAction: string;
    swipeRightAction: string;
    doubleTapAction: string;
    longPressAction: string;
    absoluteLogPath: string; // Absolute path to write logs (bypasses vault)
}

const DEFAULT_SETTINGS: TodoFlowSettings = {
    targetFolder: 'todo-flow',
    exportFolder: '',
    timingMode: 'now',
    fixedStartTime: '09:00',
    keys: DEFAULT_KEYBINDINGS,
    debug: false,
    enableShake: false,
    lastTray: null,
    swipeLeftAction: 'archive',
    swipeRightAction: 'complete',
    doubleTapAction: 'anchor',
    longPressAction: 'none',
    absoluteLogPath: ''
}

import { FileLogger } from './logger.js';

import { ViewManager } from './ViewManager.js';

export default class TodoFlowPlugin extends Plugin {
    settings!: TodoFlowSettings;
    historyManager!: HistoryManager;
    logger!: FileLogger;
    viewManager!: ViewManager;
    shakeDetector?: ShakeDetector;
    stackPersistenceService!: StackPersistenceService;

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

        const buildId = typeof process !== 'undefined' ? (process.env as any).BUILD_ID : 'unknown';
        await this.logger.info(`[Todo Flow] Loading v${this.manifest.version} (Build ${buildId})`);
        console.log('[Todo Flow] Logger initialized');

        // Watch for external modifications via Metadata Cache (more stable than vault.modify)
        this.registerEvent(
            this.app.metadataCache.on('changed', async (file) => {
                if (!(file instanceof TFile)) return;

                // Smoke signal for E2E (in gitignored logs/)
                try {
                    if (!(await this.app.vault.adapter.exists('logs'))) {
                        await this.app.vault.adapter.mkdir('logs');
                    }
                    await this.app.vault.adapter.write('logs/modify-detected.txt', `Detected ${file.path} at ${new Date().toISOString()}`);
                } catch (e) { }

                // LOGIC LEAK REMOVED: StackView/NavigationManager now manage their own watchers.
                // This prevents global event competition and ensures isolation.
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
            })
        );

        this.registerView(
            VIEW_TYPE_STACK,
            (leaf) => {
                if (this.isMobile) {
                    return new LeanStackView(leaf, this.settings, this.logger, this.stackPersistenceService, (task: TaskNode) => {
                        this.syncTaskToNote(task);
                    });
                }
                return new StackView(leaf, this.settings, this.historyManager, this.logger, this.viewManager, this.stackPersistenceService, (task: TaskNode) => {
                    this.syncTaskToNote(task);
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


        this.addCommand({
            id: 'open-todo-dump',
            name: 'Open Todo Dump',
            callback: () => {
                this.logger.info('[Command] Executing open-todo-dump');
                this.activateView(VIEW_TYPE_DUMP);
            }
        });

        this.addCommand({
            id: 'start-triage',
            name: 'Start Triage',
            callback: async () => {
                const { TaskQueryService } = await import('./services/TaskQueryService.js');
                const queryService = new TaskQueryService(this.app, this.logger);
                const tasks = await queryService.getDumpedTasks();

                if (tasks.length === 0) {
                    new (window as any).Notice('No items in Dump to triage!');
                    return;
                }

                this.activateTriage(tasks);
            }
        });

        console.log('[Todo Flow] Registering reprocess-nlp command');
        this.addCommand({
            id: 'reprocess-nlp',
            name: 'Reprocess NLP Metadata (Smart Parse)',
            callback: async () => {
                this.logger.info('[Command] Executing reprocess-nlp');
                try {
                    const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_STACK)[0];
                    if (leaf && leaf.view) {
                        // Cast to any to bypass strict type check for now (StackView methods are public but TS might not see them via generic View)
                        const stackView = leaf.view as any;

                        if (stackView.getController && stackView.update) {
                            const controller = stackView.getController();
                            if (controller) {
                                // Static import used here
                                const cmd = new ReprocessTaskCommand(controller, async (task) => {
                                    await this.syncTaskToNote(task);
                                });

                                await this.historyManager.executeCommand(cmd);
                                stackView.update();
                                this.logger.info('[Command] JSON Reprocessing successfully completed.');
                                new (window as any).Notice('NLP Reprocessing Complete');
                            }
                        } else {
                            this.logger.warn('[Command] StackView controller missing.');
                            new (window as any).Notice('Open the Task Stack view first.');
                        }
                    } else {
                        this.logger.warn('[Command] StackView leaf not found.');
                        new (window as any).Notice('Open the Task Stack view first.');
                    }
                } catch (error) {
                    this.logger.error(`[Command] Reprocess Failed: ${error}`);
                    new (window as any).Notice('Reprocess Failed. Check logs.');
                }
            }
        });


        this.addCommand({
            id: 'open-daily-stack',
            name: 'Open Daily Stack',
            callback: async () => {
                // BUG-011: Flush any pending debounced saves from an existing StackView
                const existingLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_STACK)[0];
                if (existingLeaf && existingLeaf.view) {
                    this.logger.info(`[main] Found StackView leaf. View type: ${existingLeaf.view.getViewType()}`);
                    // Use a more robust check than instanceof if needed, or cast to any
                    const view = existingLeaf.view as any;
                    if (view.flushPersistence) {
                        this.logger.info(`[main] Calling flushPersistence on existing StackView...`);
                        await view.flushPersistence();
                        this.logger.info(`[main] flushPersistence completed.`);
                    } else {
                        this.logger.warn(`[main] view.flushPersistence is NOT defined!`);
                    }
                }

                // 1. Try to load from "todo-flow/CurrentStack.md"
                const persistencePath = `${this.settings.targetFolder}/CurrentStack.md`;
                const savedIds = await this.stackPersistenceService.loadStackIds(persistencePath);

                if (savedIds.length > 0) {
                    await this.activateStack(savedIds, persistencePath);
                } else if (this.settings.lastTray && this.settings.lastTray.length > 0) {
                    // 2. Fallback to settings.lastTray (Migration path)
                    await this.activateStack(this.settings.lastTray, persistencePath); // Save to file next time
                } else {
                    // 3. Fallback to Shortlist BUT use persistencePath as backing file
                    this.logger.info(`[main] No saved stack or lastTray found. Defaulting to QUERY:SHORTLIST`);
                    await this.activateStack('QUERY:SHORTLIST', persistencePath); // Pass backing file
                    new Notice('Loading Stack from Shortlist...');
                }
            }
        });

        this.addCommand({
            id: 'add-task-to-stack',
            name: 'Add Task to Stack',
            callback: () => {
                // BUG-001: Context-aware command handling
                const activeLeaf = (this.app.workspace as any).activeLeaf;
                const activeViewType = activeLeaf?.view?.getViewType();
                const triageLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TRIAGE);

                // Check active leaf first (standard sovereignty)
                if (activeViewType === VIEW_TYPE_TRIAGE) {
                    const view = activeLeaf.view as TriageView;
                    if (view.openAddModal) {
                        view.openAddModal();
                        return;
                    }
                }

                // Fallback: If Triage is open and we suspect it should be sovereign (e.g. focused index)
                const sovereignTriage = triageLeaves.find(l => this.viewManager.isSovereign((l as any).id));
                if (sovereignTriage) {
                    (sovereignTriage.view as TriageView).openAddModal();
                    return;
                }

                const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_STACK)[0];
                if (leaf && leaf.view instanceof StackView) {
                    leaf.view.openAddModal();
                    this.app.workspace.revealLeaf(leaf);
                } else {
                    new (window as any).Notice('Please open the Daily Stack view first.');
                }
            }
        });

        this.addCommand({
            id: 'clear-daily-stack',
            name: 'Clear Daily Stack',
            callback: async () => {
                const confirmed = await (window as any).confirm('Are you sure you want to clear the entire daily stack?');
                if (!confirmed) return;

                this.logger.info('[main] Clearing Daily Stack');
                const persistencePath = `${this.settings.targetFolder}/CurrentStack.md`;
                await this.stackPersistenceService.saveStack([], persistencePath);

                const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_STACK)[0];
                if (leaf && leaf.view && (leaf.view as any).reload) {
                    await (leaf.view as any).reload();
                }
                new (window as any).Notice('Daily Stack cleared.');
            }
        });

        this.addCommand({
            id: 'sync-completed-tasks',
            name: 'Sync Completed Tasks from Current Export',
            callback: async () => {
                const view = this.app.workspace.getActiveViewOfType(this.app.workspace.getLeaf(false).view.constructor as any);
                // The above is a bit hacky to get generic view. Better:
                const activeLeaf = this.app.workspace.activeLeaf;
                if (!activeLeaf || !activeLeaf.view || activeLeaf.view.getViewType() !== 'markdown') {
                    new (window as any).Notice('Open a markdown export file to sync.');
                    return;
                }

                // @ts-ignore - We know it's a MarkdownView if type is markdown
                const editor = activeLeaf.view.editor;
                if (editor) {
                    const content = editor.getValue();
                    const service = new SyncService(this.app);
                    const count = await service.syncExportToVault(content);
                    if (count > 0) {
                        new Notice(`Synced ${count} tasks back to their original notes.`);
                    } else {
                        new Notice('No matching tasks found to sync.');
                    }
                }
            }
        });

        this.addCommand({
            id: 'add-linked-docs-to-stack',
            name: 'Add Linked Docs to Stack',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    new Notice('Open a file first to import links.');
                    return;
                }

                const service = new SmartImportService(this.app, this.logger);
                const count = await service.importLinksToDailyStack(activeFile.path, this.settings.targetFolder);

                if (count > 0) {
                    new Notice(`Added ${count} tasks to daily stack.`);
                    const persistencePath = `${this.settings.targetFolder}/CurrentStack.md`;
                    const savedIds = await this.stackPersistenceService.loadStackIds(persistencePath);
                    await this.activateStack(savedIds, persistencePath);
                } else {
                    new Notice('No new linked tasks found.');
                }
            }
        });

        this.addCommand({
            id: 'export-current-stack',
            name: 'Export to Note',
            callback: async () => {
                const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_STACK);
                if (leaves.length === 0 || !leaves[0]) {
                    new Notice('Open the Stack View first.');
                    return;
                }
                const stackView = leaves[0].view as StackView;
                const tasks = stackView.getTasks();

                const exportService = new ExportService();
                const content = exportService.formatExport(tasks);

                // Save to file if exportFolder is configured
                if (this.settings.exportFolder) {
                    try {
                        const fileName = `Export-${moment().format('YYYY-MM-DD-HHmm')}.md`;
                        const folderPath = this.settings.exportFolder.endsWith('/') ? this.settings.exportFolder : this.settings.exportFolder + '/';
                        const fullPath = folderPath + fileName;
                        await this.app.vault.create(fullPath, content);
                        new Notice(`Stack exported to ${fullPath}`);
                    } catch (err) {
                        console.error('Export failed:', err);
                        new Notice('Failed to save export file. Check console for details.');
                    }
                } else {
                    new Notice('Please configure an Export Folder in settings to save exports.');
                }
            }
        });

        this.addCommand({
            id: 'toggle-timing-mode',
            name: 'Toggle Timing Mode (Now vs Fixed)',
            callback: () => {
                this.settings.timingMode = this.settings.timingMode === 'now' ? 'fixed' : 'now';
                this.saveSettings();
                this.refreshStackView();
                new (window as any).Notice(`Timing Mode: ${this.settings.timingMode === 'now' ? 'Dynamic (Now)' : 'Fixed (' + this.settings.fixedStartTime + ')'}`);
            }
        });

        this.addCommand({
            id: 'toggle-dev-mode',
            name: 'Toggle Developer Mode (Tracing)',
            callback: () => {
                this.settings.debug = !this.settings.debug;
                this.logger.setEnabled(this.settings.debug);
                this.saveSettings();
                new (window as any).Notice(`Developer Mode: ${this.settings.debug ? 'ON' : 'OFF'}`);
            }
        });

        this.addCommand({
            id: 'clear-logs',
            name: 'Clear Log File',
            callback: async () => {
                if (await this.app.vault.adapter.exists('todo-flow.log')) {
                    await this.app.vault.adapter.write('todo-flow.log', '');
                    new (window as any).Notice('Logs cleared');
                }
            }
        });



        this.addCommand({
            id: 'open-folder-as-stack',
            name: 'Open Folder as Stack',
            callback: async () => {
                const { FolderSuggester } = await import('./ui/Suggesters.js');
                new FolderSuggester(this.app, (folder) => {
                    this.activateStack(folder.path);
                }).open();
            }
        });

        this.addCommand({
            id: 'open-file-as-stack',
            name: 'Open File as Stack',
            callback: async () => {
                const { FileSuggester } = await import('./ui/Suggesters.js');
                new FileSuggester(this.app, (file) => {
                    this.activateStack(file.path);
                }).open();
            }
        });

        this.addCommand({
            id: 'triage-folder',
            name: 'Triage Folder',
            callback: async () => {
                const { FolderSuggester } = await import('./ui/Suggesters.js');
                new FolderSuggester(this.app, async (folder) => {
                    new Notice(`Triage: Processing ${folder.name}...`);
                    const tasks = await this.getTasksFromFolder(folder.path);
                    if (tasks.length === 0) {
                        new (window as any).Notice('No markdown files in folder!');
                        return;
                    }
                    this.activateTriage(tasks);
                }).open();
            }
        });

        this.addCommand({
            id: 'triage-file',
            name: 'Triage File',
            callback: async () => {
                const { FileSuggester } = await import('./ui/Suggesters.js');
                new FileSuggester(this.app, async (file) => {
                    this.logger.info(`[main.ts] Triage File: Selected ${file.path}. Resolving child tasks...`);
                    const { StackLoader } = await import('./loaders/StackLoader.js');
                    const loader = new StackLoader(this.app, this.logger);
                    const taskNodes = await loader.load(file.path);

                    if (taskNodes.length === 0) {
                        new (window as any).Notice('No tasks found linked in this file!');
                        return;
                    }

                    this.activateTriage(taskNodes);
                }).open();
            }
        });

        this.addCommand({
            id: 'open-settings',
            name: 'Open Settings',
            callback: () => {
                this.logger.info('[Command] Executing open-settings');
                // @ts-ignore - setting is a private property in Obsidian API but widely used/available
                if (this.app.setting && this.app.setting.openTabById) {
                    // @ts-ignore
                    this.app.setting.open();
                    // @ts-ignore
                    this.app.setting.openTabById('todo-flow');
                } else {
                    // Fallback to generic settings if the specific API is not found (though it should be)
                    // @ts-ignore
                    this.app.commands.executeCommandById('app:open-settings');
                }
            }
        });

        this.addCommand({
            id: 'insert-stack-at-cursor',
            name: 'Insert Current Stack at Cursor',
            editorCallback: async (editor: any, view: any) => {
                this.logger.info('[Command] Executing insert-stack-at-cursor');

                // 1. Find the StackView
                const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_STACK);
                if (leaves.length === 0) {
                    new (window as any).Notice('Open the Task Stack view first.');
                    return;
                }

                // Use the first one
                const leaf = leaves[0];
                if (!leaf) return;
                const stackView = leaf.view as StackView;

                // 2. Get Tasks
                // We can access this.tasks from StackView directly as it is public
                const tasks = stackView.tasks;
                if (!tasks || tasks.length === 0) {
                    new (window as any).Notice('Stack is empty or not loaded.');
                    return;
                }

                // 3. Generate Markdown
                const content = serializeStackToMarkdown(tasks);

                // 4. Insert at cursor
                editor.replaceSelection(content);
                new (window as any).Notice('Stack inserted!');
            }
        });

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
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf;
        const leaves = workspace.getLeavesOfType(viewType);

        if (leaves.length > 0) {
            leaf = leaves[0]!;
            // If view exists, we might need to update its props but Obsidian Views
            // are tricky. For DumpView, we just focus it.
        } else {
            leaf = workspace.getLeaf(true);
            await leaf.setViewState({ type: viewType, active: true });
        }

        workspace.revealLeaf(leaf);
    }

    async activateTriage(tasks: TaskNode[]) {
        const { workspace } = this.app;
        let leaf = workspace.getLeaf(true);
        this.logger.info(`[main.ts] activateTriage: Initializing session with ${tasks.length} tasks.`);

        const persistencePath = `${this.settings.targetFolder}/CurrentStack.md`;

        const view = new TriageView(leaf, tasks, this.settings, this.historyManager, this.logger, this.viewManager, async (results: { shortlist: TaskNode[], notNow: TaskNode[], strategy?: 'merge' | 'overwrite' }) => {
            let ids = results.shortlist.map((t: TaskNode) => t.id);
            this.logger.info(`[main.ts] Triage callback: Received ${ids.length} shortlisted tasks. Strategy: ${results.strategy || 'default'}`);

            // 1. Conflict / Merge Handling
            if (results.strategy === 'merge') {
                const existingIds = await this.stackPersistenceService.loadStackIds(persistencePath);
                // Deduplicate: Add new IDs only if they aren't already in existing
                const mergedMap = new Set(existingIds);
                ids.forEach(id => mergedMap.add(id));
                ids = Array.from(mergedMap);
                this.logger.info(`[main.ts] MERGE Strategy: existing=${existingIds.length} + new=${results.shortlist.length} -> result=${ids.length}`);
            } else if (results.strategy === 'overwrite') {
                this.logger.info(`[main.ts] OVERWRITE Strategy: Discarding previous stack.`);
            }

            // 2. Auto-Backup (Always before saving if stack existed)
            if (await this.app.vault.adapter.exists(persistencePath)) {
                try {
                    // Quick load of CURRENT state on disk before we overwrite/update it
                    // Note: If we just merged, 'ids' is the NEW state. We want to backup the OLD state.
                    // But loading it again might be redundant if we just loaded it for merge. 
                    // Let's rely on loading it fresh to be safe.
                    const existingStackSrc = await this.stackPersistenceService.loadStackIds(persistencePath);
                    if (existingStackSrc.length > 0) {
                        const { StackLoader } = await import('./loaders/StackLoader.js');
                        const loader = new StackLoader(this.app, this.logger);
                        const oldTasks = await loader.loadSpecificFiles(existingStackSrc);

                        const exportService = new ExportService();
                        const backupContent = exportService.formatExport(oldTasks);
                        const backupPath = `${this.settings.targetFolder}/Backups/Backup-${moment().format('YYYY-MM-DD-HHmmss')}.md`;

                        // Ensure backup dir
                        if (!(await this.app.vault.adapter.exists(`${this.settings.targetFolder}/Backups`))) {
                            await this.app.vault.adapter.mkdir(`${this.settings.targetFolder}/Backups`);
                        }

                        await this.app.vault.create(backupPath, backupContent);
                        this.logger.info(`[main.ts] Auto-Backup created at ${backupPath}`);
                    }
                } catch (e) {
                    this.logger.error(`[main.ts] Backup failed: ${e}`);
                }
            }

            // 3. Save & Activate
            await this.stackPersistenceService.saveStack(
                ids.map(id => ({ id, title: 'Ref', status: 'todo', children: [] } as any)),
                persistencePath
            );

            // AUTO-START STACK: Direct Injection (BUG-022 FIX)
            // Instead of triggering a general command that re-loads from disk,
            // we pass the known IDs directly to activateStack.

            // Sovereignty Protection: Silence watchers during the handoff window (Desktop race condition)
            this.stackPersistenceService.silence(1000);

            await this.activateStack(ids, persistencePath);

        }, async (title: string, options?: any) => {
            return this.onCreateTask(title, options);
        }, async () => {
            // checkForConflict impl
            try {
                const exists = await this.app.vault.adapter.exists(persistencePath);
                let ids: string[] = [];
                if (exists) {
                    ids = await this.stackPersistenceService.loadStackIds(persistencePath);
                }
                return exists && ids.length > 0;
            } catch (e) {
                this.logger.error(`[main.ts] checkForConflict error: ${e}`);
                return false;
            }
        });
        await leaf.open(view);
        workspace.revealLeaf(leaf);
    }

    async activateStack(input: string | string[], backingFile?: string) {
        const { workspace } = this.app;
        let leaf: WorkspaceLeaf;

        this.logger.info(`[main.ts] activateStack target: ${Array.isArray(input) ? `EXPLICIT LIST (${input.length} IDs)` : input}`);

        /* 
           PERSISTENCE CHANGE: 
           We no longer strictly rely on settings.lastTray for persistence. 
           If backingFile is provided, we use that.
        */

        // Try to find existing stack view
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_STACK);
        if (leaves.length > 0) {
            leaf = leaves[0]!;
        } else {
            leaf = workspace.getLeaf(true);
        }

        let state: any = { active: true };

        if (Array.isArray(input)) {
            // Explicit ID mode
            // If checking persistence, we still update lastTray as a backup? Maybe safe for now.
            this.settings.lastTray = input;
            await this.saveData(this.settings);

            state.state = { ids: input };
            if (backingFile) {
                state.state.rootPath = backingFile;
            }
        } else {
            // Folder / Query mode
            if (backingFile) {
                // Special case: Loading from source but wanting to persist to a file.
                // We should resolve the IDs now so the view starts in "Explicit file-backed" mode.
                this.logger.info(`[main.ts] Resolving source "${input}" for backing file "${backingFile}"`);
                const { StackLoader } = await import('./loaders/StackLoader.js');
                const loader = new StackLoader(this.app, this.logger);
                const tasks = await loader.load(input);
                const ids = tasks.map(t => t.id);

                state.state = {
                    ids: ids,
                    rootPath: backingFile
                };
            } else {
                state.state = { rootPath: input };
            }
        }

        await leaf.setViewState({
            type: VIEW_TYPE_STACK,
            active: true,
            state: state.state
        });

        workspace.revealLeaf(leaf);
    }

    refreshStackView() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_STACK);
        leaves.forEach(leaf => {
            if (leaf.view instanceof StackView) {
                leaf.view.updateSettings(this.settings);
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

    async getFilesFromFolder(folderPath: string): Promise<TFile[]> {
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (folder instanceof TFolder) {
            const files: TFile[] = [];
            folder.children.forEach(child => {
                if (child instanceof TFile && child.extension === 'md') {
                    files.push(child);
                }
            });
            return files;
        }
        return [];
    }

    async syncTaskToNote(task: TaskNode) {
        const ownDuration = task.originalDuration ?? task.duration;
        this.logger.info(`[DEBUG] Syncing Task Metadata to Disk: ID=${task.id} | Title="${task.title}" | Dur=${ownDuration} (Rollup: ${task.duration}) | Status=${task.status} | Anchored=${task.isAnchored}`);
        const file = this.app.vault.getAbstractFileByPath(task.id);
        if (!(file instanceof TFile)) return;

        // BUG-007: Inform persistence service this is an internal write
        this.stackPersistenceService.recordInternalWrite(file.path);

        await this.app.vault.process(file, (content) => {
            let updated = content;
            updated = updateMetadataField(updated, 'task', task.title);
            updated = updateMetadataField(updated, 'duration', ownDuration);
            updated = updateMetadataField(updated, 'status', task.status);
            updated = updateMetadataField(updated, 'anchored', task.isAnchored);
            if (task.flow_state) {
                updated = updateMetadataField(updated, 'flow_state', task.flow_state);
            }
            if (task.isAnchored && task.startTime) {
                updated = updateMetadataField(updated, 'startTime', task.startTime.format('YYYY-MM-DD HH:mm'));
            }
            return updated;
        });
    }

    // Assuming StackView class exists elsewhere in the full document
    // and has getDisplayText() and getState() methods.
    // The following methods are inserted into the StackView class.
    // This is a placeholder as StackView is not in the provided content.
    // If StackView were present, the insertion would be:
    /*
    class StackView extends ItemView {
        // ... existing properties and methods ...

        getDisplayText() {
            return "Daily Stack";
        }

        getTasks(): TaskNode[] {
            return this.tasks; // Assuming 'this.tasks' holds the current tasks in StackView
        }

        getState(): Record<string, unknown> {
            // ... existing getState implementation ...
        }
        // ... rest of StackView class ...
    }
    */

    async onCreateTask(title: string, options?: { startTime?: moment.Moment | undefined, duration?: number | undefined, isAnchored?: boolean | undefined, parentPath?: string | undefined }): Promise<TaskNode> {
        const folderPath = this.settings.targetFolder;
        // Ensure the target folder exists
        if (!(await this.app.vault.adapter.exists(folderPath))) {
            try {
                await this.app.vault.createFolder(folderPath);
            } catch (e) {
                // Ignore if it already exists or other issues, but log it
            }
        }

        const filename = generateFilename(title);
        const path = `${folderPath}/${filename}`;

        const duration = options?.duration ?? 30;
        const isAnchored = options?.isAnchored ?? false;
        const startTime = options?.startTime;

        // Return a temporary node for immediate sync; Obsidian will create the actual file in background
        // but we need the node for the StackController to work immediately.
        const newNode: TaskNode = {
            id: path,
            title: title,
            duration: duration,
            status: 'todo',
            isAnchored: isAnchored,
            startTime: startTime,
            children: []
        };

        // Construct Frontmatter
        let fileContent = `---\ntask: ${title}\nstatus: todo\nduration: ${duration}`;
        if (isAnchored) {
            fileContent += `\nanchored: true`;
            if (startTime) {
                fileContent += `\nstartTime: ${startTime.format('YYYY-MM-DD HH:mm')}`;
            }
        }
        fileContent += `\n---\n# ${title}`;

        // Inform persistence service this is an internal write to avoid race with watcher
        this.stackPersistenceService.recordInternalWrite(path);

        // Asynchronously create the file in the vault AND await it
        await this.app.vault.create(path, fileContent);

        // Link Injection for child stacks
        if (options?.parentPath) {
            await this.injectLinkToParent(options.parentPath, path, title);
        }

        return newNode;
    }

    async injectLinkToParent(parentPath: string, childPath: string, childTitle: string) {
        const parentFile = this.app.vault.getAbstractFileByPath(parentPath);
        if (!(parentFile instanceof TFile)) {
            this.logger.warn(`[main.ts] injectLinkToParent skipped: Parent file not found at ${parentPath}`);
            return;
        }

        const timestamp = moment().format('YYYY-MM-DD HH:mm');
        const linkLine = `\n\nAdded on: ${timestamp}\n- [ ] [[${childPath}|${childTitle}]]`;

        this.stackPersistenceService.recordInternalWrite(parentPath);

        await this.app.vault.process(parentFile, (content) => {
            return content.trimEnd() + linkLine;
        });
    }

    async getTasksFromFolder(folderPath: string): Promise<TaskNode[]> {
        const files = await this.getFilesFromFolder(folderPath);
        // Use the new GraphBuilder to construct the task graph
        const builder = new GraphBuilder(this.app);
        return builder.buildGraph(files);
    }
}

class TodoFlowSettingTab extends PluginSettingTab {
    plugin: TodoFlowPlugin;

    constructor(app: App, plugin: TodoFlowPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Target Folder')
            .setDesc('Folder where new thoughts and tasks will be created')
            .addText(text => text
                .setPlaceholder('todo-flow')
                .setValue(this.plugin.settings.targetFolder)
                .onChange(async (value) => {
                    this.plugin.settings.targetFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Export Folder')
            .setDesc('Default folder for Stack exports (leave empty for Vault root)')
            .addText(text => text
                .setPlaceholder('e.g. Exports')
                .setValue(this.plugin.settings.exportFolder)
                .onChange(async (value) => {
                    this.plugin.settings.exportFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Timing Mode')
            .setDesc('Choose how the Daily Stack schedule is calculated')
            .addDropdown(dropdown => dropdown
                .addOption('now', 'Dynamic (Start from Now)')
                .addOption('fixed', 'Fixed (Start from specific time)')
                .setValue(this.plugin.settings.timingMode)
                .onChange(async (value) => {
                    this.plugin.settings.timingMode = value as 'now' | 'fixed';
                    await this.plugin.saveSettings();
                    this.plugin.refreshStackView();
                    this.display(); // Refresh to show/hide fixed time setting
                }));

        if (this.plugin.settings.timingMode === 'fixed') {
            new Setting(containerEl)
                .setName('Fixed Start Time')
                .setDesc('Example: 09:00, 14:30')
                .addText(text => text
                    .setPlaceholder('HH:mm')
                    .setValue(this.plugin.settings.fixedStartTime)
                    .onChange(async (value) => {
                        this.plugin.settings.fixedStartTime = value;
                        await this.plugin.saveSettings();
                        this.plugin.refreshStackView();
                    }));
        }

        new Setting(containerEl)
            .setName('Developer Mode')
            .setDesc('Enable verbose diagnostic tracing in the console (Cmd+Option+I)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debug)
                .onChange(async (value) => {
                    this.plugin.settings.debug = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshStackView();
                }));

        if (Platform.isMobile) {
            containerEl.createEl('h3', { text: 'Mobile Interactions' });

            new Setting(containerEl)
                .setName('Shake to Undo')
                .setDesc('Shake your device to undo the last action')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.enableShake)
                    .onChange(async (value) => {
                        this.plugin.settings.enableShake = value;
                        await this.plugin.saveSettings();
                        if (value) {
                            // @ts-ignore
                            this.plugin.initShakeDetector();
                        } else if (this.plugin.shakeDetector) {
                            this.plugin.shakeDetector.stop();
                        }
                        this.display(); // Refresh to show/hide permission button
                    }));

            if (this.plugin.settings.enableShake) {
                new Setting(containerEl)
                    .setName('Motion Permission')
                    .setDesc('iOS 13+ requires explicit permission to access motion data')
                    .addButton(button => button
                        .setButtonText('Request Permission')
                        .onClick(async () => {
                            const granted = await ShakeDetector.requestPermission();
                            if (granted) {
                                new (window as any).Notice('Motion permission granted!');
                                // @ts-ignore
                                this.plugin.initShakeDetector();
                            } else {
                                new (window as any).Notice('Permission denied or failed.');
                            }
                        }));
            }

            const gestureOptions = {
                'archive': 'Archive',
                'complete': 'Toggle Complete',
                'anchor': 'Toggle Anchor',
                'force-open': 'Force Open / Standard Editor',
                'none': 'None'
            };

            new Setting(containerEl)
                .setName('Swipe Left Action')
                .setDesc('Action when swiping left on a task card')
                .addDropdown(dropdown => dropdown
                    .addOptions(gestureOptions)
                    .setValue(this.plugin.settings.swipeLeftAction)
                    .onChange(async (value) => {
                        this.plugin.settings.swipeLeftAction = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Swipe Right Action')
                .setDesc('Action when swiping right on a task card')
                .addDropdown(dropdown => dropdown
                    .addOptions(gestureOptions)
                    .setValue(this.plugin.settings.swipeRightAction)
                    .onChange(async (value) => {
                        this.plugin.settings.swipeRightAction = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Double Tap Action')
                .setDesc('Action when double-tapping a task card')
                .addDropdown(dropdown => dropdown
                    .addOptions(gestureOptions)
                    .setValue(this.plugin.settings.doubleTapAction)
                    .onChange(async (value) => {
                        this.plugin.settings.doubleTapAction = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Long Press Action')
                .setDesc('Action when holding a task card (replaces Hold-to-Drag)')
                .addDropdown(dropdown => dropdown
                    .addOptions(gestureOptions)
                    .setValue(this.plugin.settings.longPressAction)
                    .onChange(async (value) => {
                        this.plugin.settings.longPressAction = value;
                        await this.plugin.saveSettings();
                    }));
        }

        containerEl.createEl('h3', { text: 'Navigation' });
        this.addKeySetting(containerEl, 'navUp', 'Move Focus Up');
        this.addKeySetting(containerEl, 'navDown', 'Move Focus Down');
        this.addKeySetting(containerEl, 'forceOpen', 'Force Open / Drill Down');
        this.addKeySetting(containerEl, 'goBack', 'Go Back');
        this.addKeySetting(containerEl, 'confirm', 'Open / Drill Down (Contextual)');

        containerEl.createEl('h3', { text: 'Actions' });
        this.addKeySetting(containerEl, 'toggleDone', 'Toggle Done');
        this.addKeySetting(containerEl, 'createTask', 'Create Task');
        this.addKeySetting(containerEl, 'quickAdd', 'Quick Add to Stack');
        this.addKeySetting(containerEl, 'rename', 'Rename Task');
        this.addKeySetting(containerEl, 'editStartTime', 'Set Start Time');
        this.addKeySetting(containerEl, 'deleteTask', 'Delete Task');
        this.addKeySetting(containerEl, 'archive', 'Archive Task (Stack)');
        this.addKeySetting(containerEl, 'export', 'Export to Note');

        containerEl.createEl('h3', { text: 'Organization' });
        this.addKeySetting(containerEl, 'moveUp', 'Move Task Up');
        this.addKeySetting(containerEl, 'moveDown', 'Move Task Down');
        this.addKeySetting(containerEl, 'anchor', 'Toggle Anchor');
        this.addKeySetting(containerEl, 'durationUp', 'Increase Duration');
        this.addKeySetting(containerEl, 'durationDown', 'Decrease Duration');
        this.addKeySetting(containerEl, 'undo', 'Undo');
        this.addKeySetting(containerEl, 'redo', 'Redo');
    }

    private addKeySetting(containerEl: HTMLElement, key: Exclude<keyof KeybindingSettings, 'debug'>, name: string) {
        new Setting(containerEl)
            .setName(name)
            .setDesc(`Current: ${formatKeys(this.plugin.settings.keys[key] as string[])}`)
            .addText(text => text
                .setPlaceholder('e.g. k, ArrowUp')
                .setValue(formatKeys(this.plugin.settings.keys[key] as string[]))
                .onChange(async (value) => {
                    const parsed = parseKeys(value);
                    this.plugin.settings.keys[key] = parsed;
                    await this.plugin.saveSettings();
                    this.plugin.refreshStackView();
                }));
    }
}
