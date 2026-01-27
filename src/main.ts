import { Plugin, PluginSettingTab, App, Setting, WorkspaceLeaf, TFolder, TFile } from 'obsidian';
import { DumpView, VIEW_TYPE_DUMP } from './views/DumpView.js';
import { TriageView, VIEW_TYPE_TRIAGE } from './views/TriageView.js';
import { StackView, VIEW_TYPE_STACK } from './views/StackView.js';
import { type TaskNode } from './scheduler.js';
import { parseTitleFromFilename, updateMetadataField, generateFilename } from './persistence.js';
import { GraphBuilder } from './GraphBuilder.js';
import moment from 'moment';
import { HistoryManager } from './history.js';
import { SyncService } from './services/SyncService.js';

import { DEFAULT_KEYBINDINGS, type KeybindingSettings } from './keybindings.js';
import { formatKeys, parseKeys } from './utils/settings-utils.js';

export interface TodoFlowSettings {
    targetFolder: string;
    exportFolder: string;
    timingMode: 'now' | 'fixed';
    fixedStartTime: string;
    keys: KeybindingSettings;
    debug: boolean;
    lastTray?: string[] | null;
}

const DEFAULT_SETTINGS: TodoFlowSettings = {
    targetFolder: 'todo-flow',
    exportFolder: '',
    timingMode: 'now',
    fixedStartTime: '09:00',
    keys: DEFAULT_KEYBINDINGS,
    debug: false,
    lastTray: null
}

import { FileLogger } from './logger.js';

import { ViewManager } from './ViewManager.js';

export default class TodoFlowPlugin extends Plugin {
    settings!: TodoFlowSettings;
    historyManager!: HistoryManager;
    logger!: FileLogger;
    viewManager!: ViewManager;

    async onload() {
        await this.loadSettings();
        this.historyManager = new HistoryManager();
        this.logger = new FileLogger(this.app, this.settings.debug);
        this.viewManager = new ViewManager(this.app, this.logger);
        await this.logger.info(`[Todo Flow] Loading v${this.manifest.version} (Build 2026-01-27 10:48)`);

        await this.logger.info(`Todo Flow Plugin loading...`);

        this.addSettingTab(new TodoFlowSettingTab(this.app, this));

        // ... (views registration) ...

        this.registerView(
            VIEW_TYPE_DUMP,
            (leaf) => new DumpView(leaf, this.settings.targetFolder, (tasks) => {
                this.activateTriage(tasks);
            })
        );

        this.registerView(
            VIEW_TYPE_TRIAGE,
            (leaf) => new TriageView(leaf, [], this.settings, this.historyManager, this.logger, (results) => {
                this.logger.info(`Triage complete: ${JSON.stringify(results)}`);
                // Auto-start Stack after Triage (Workflow)
                // @ts-ignore
                this.app.commands.executeCommandById('todo-flow:open-daily-stack');
            })
        );

        this.registerView(
            VIEW_TYPE_STACK,
            (leaf) => new StackView(leaf, this.settings, this.historyManager, this.logger, (task) => {
                this.syncTaskToNote(task);
            }, (title) => {
                return this.onCreateTask(title);
            })
        );

        // Register ViewManager events
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', async () => {
                await this.viewManager.handleActiveLeafChange();
            })
        );


        this.addCommand({
            id: 'open-todo-dump',
            name: 'Open Todo Dump',
            callback: () => {
                this.activateView(VIEW_TYPE_DUMP);
            }
        });

        this.addCommand({
            id: 'start-triage',
            name: 'Start Triage from target folder',
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

        this.addCommand({
            id: 'open-daily-stack',
            name: 'Open Daily Stack',
            callback: async () => {
                // Check for saved tray
                if (this.settings.lastTray && this.settings.lastTray.length > 0) {
                    await this.activateStack(this.settings.lastTray);
                } else {
                    // Default to Shortlisted items
                    await this.activateStack('QUERY:SHORTLIST');
                }
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
                    new (window as any).Notice(`Synced ${count} tasks from export.`);
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

        // Pass settings to TriageView
        const view = new TriageView(leaf, tasks, this.settings, this.historyManager, this.logger, (results) => {
            const ids = results.shortlist.map(t => t.id);
            this.logger.info(`[main.ts] Triage callback: Session isolation active. Received ${ids.length} shortlisted tasks: ${JSON.stringify(ids)}`);
            // Auto-start Stack with EXPLICIT IDs (Session Isolation)
            this.activateStack(ids);
        });
        await leaf.open(view);
        workspace.revealLeaf(leaf);
    }

    async activateStack(input: string | string[]) {
        const { workspace } = this.app;
        let leaf: WorkspaceLeaf;

        this.logger.info(`[main.ts] activateStack target: ${Array.isArray(input) ? `EXPLICIT LIST (${input.length} IDs)` : input}`);

        // PERSISTENCE: If this is an explicit tray (list of IDs), save it
        if (Array.isArray(input)) {
            this.settings.lastTray = input;
            await this.saveData(this.settings);
        }

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
            state.state = { ids: input };
        } else {
            // Folder / Query mode
            state.state = { rootPath: input };
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
        this.logger.info(`[DEBUG] Syncing Task Metadata to Disk: ID=${task.id} | Title=${task.title} | Dur=${ownDuration} (Rollup: ${task.duration}) | Status=${task.status} | Anchored=${task.isAnchored}`);
        const file = this.app.vault.getAbstractFileByPath(task.id);
        if (!(file instanceof TFile)) return;

        await this.app.vault.process(file, (content) => {
            let updated = content;
            updated = updateMetadataField(updated, 'task', task.title);
            updated = updateMetadataField(updated, 'duration', ownDuration);
            updated = updateMetadataField(updated, 'status', task.status);
            updated = updateMetadataField(updated, 'anchored', task.isAnchored);
            if (task.isAnchored && task.startTime) {
                updated = updateMetadataField(updated, 'startTime', task.startTime.format('YYYY-MM-DD HH:mm'));
            }
            return updated;
        });
    }

    onCreateTask(title: string): TaskNode {
        const filename = generateFilename(title);
        const path = `${this.settings.targetFolder}/${filename}`;

        // Return a temporary node for immediate sync; Obsidian will create the actual file in background
        // but we need the node for the StackController to work immediately.
        const newNode: TaskNode = {
            id: path,
            title: title,
            duration: 30,
            status: 'todo',
            isAnchored: false,
            children: []
        };

        // Asynchronously create the file in the vault
        this.app.vault.create(path, `---\ntask: ${title}\nstatus: todo\nduration: 30\n---\n# ${title}`);

        return newNode;
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

        containerEl.createEl('h3', { text: 'Navigation' });
        this.addKeySetting(containerEl, 'navUp', 'Move Focus Up');
        this.addKeySetting(containerEl, 'navDown', 'Move Focus Down');
        this.addKeySetting(containerEl, 'forceOpen', 'Force Open / Drill Down');
        this.addKeySetting(containerEl, 'goBack', 'Go Back');
        this.addKeySetting(containerEl, 'confirm', 'Open / Drill Down (Contextual)');

        containerEl.createEl('h3', { text: 'Actions' });
        this.addKeySetting(containerEl, 'toggleDone', 'Toggle Done');
        this.addKeySetting(containerEl, 'createTask', 'Create Task');
        this.addKeySetting(containerEl, 'rename', 'Rename Task');
        this.addKeySetting(containerEl, 'deleteTask', 'Delete Task');
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
