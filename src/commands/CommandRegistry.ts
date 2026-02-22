import { Notice, TFile } from 'obsidian';
import type TodoFlowPlugin from '../main.js';
import { StackView, VIEW_TYPE_STACK } from '../views/StackView.js';
import { TriageView, VIEW_TYPE_TRIAGE } from '../views/TriageView.js';
import { VIEW_TYPE_DUMP } from '../views/DumpView.js';
import { serializeStackToMarkdown } from '../persistence.js';
import moment from 'moment';

export function registerCommands(plugin: TodoFlowPlugin) {
    plugin.addCommand({
        id: 'open-todo-dump',
        name: 'Open Todo Dump',
        callback: () => {
            plugin.logger.info('[Command] Executing open-todo-dump');
            plugin.activateView(VIEW_TYPE_DUMP);
        }
    });

    plugin.addCommand({
        id: 'start-triage',
        name: 'Start Triage',
        callback: async () => {
            const { TaskQueryService } = await import('../services/TaskQueryService.js');
            const queryService = new TaskQueryService(plugin.app, plugin.logger);
            const tasks = await queryService.getDumpedTasks();

            if (tasks.length === 0) {
                new (window as any).Notice('No items in Dump to triage!');
                return;
            }

            plugin.activateTriage(tasks);
        }
    });

    plugin.addCommand({
        id: 'open-daily-stack',
        name: 'Open Daily Stack',
        callback: async () => {
            const existingLeaf = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_STACK)[0];
            if (existingLeaf && existingLeaf.view) {
                plugin.logger.info(`[main] Found StackView leaf. View type: ${existingLeaf.view.getViewType()}`);
                const view = existingLeaf.view as any;
                if (view.flushPersistence) {
                    plugin.logger.info(`[main] Calling flushPersistence on existing StackView...`);
                    await view.flushPersistence();
                    plugin.logger.info(`[main] flushPersistence completed.`);
                } else {
                    plugin.logger.warn(`[main] view.flushPersistence is NOT defined!`);
                }
            }

            const persistencePath = `${plugin.settings.targetFolder}/CurrentStack.md`;
            const savedIds = await plugin.stackPersistenceService.loadStackIds(persistencePath);

            if (savedIds.length > 0) {
                await plugin.activateStack(savedIds, persistencePath);
            } else if (plugin.settings.lastTray && plugin.settings.lastTray.length > 0) {
                await plugin.activateStack(plugin.settings.lastTray, persistencePath);
            } else {
                plugin.logger.info(`[main] No saved stack or lastTray found. Defaulting to QUERY:SHORTLIST`);
                await plugin.activateStack('QUERY:SHORTLIST', persistencePath);
                new Notice('Loading Stack from Shortlist...');
            }
        }
    });

    plugin.addCommand({
        id: 'add-task-to-stack',
        name: 'Add Task to Stack',
        callback: () => {
            const activeLeaf = (plugin.app.workspace as any).activeLeaf;
            const activeViewType = activeLeaf?.view?.getViewType();
            const triageLeaves = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_TRIAGE);

            if (activeViewType === VIEW_TYPE_TRIAGE) {
                const view = activeLeaf.view as TriageView;
                if (view.openAddModal) {
                    view.openAddModal();
                    return;
                }
            }

            const sovereignTriage = triageLeaves.find(l => plugin.viewManager.isSovereign((l as any).id));
            if (sovereignTriage) {
                (sovereignTriage.view as TriageView).openAddModal();
                return;
            }

            const leaf = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_STACK)[0];
            if (leaf && leaf.view instanceof StackView) {
                leaf.view.openAddModal();
                plugin.app.workspace.revealLeaf(leaf);
            } else {
                new (window as any).Notice('Please open the Daily Stack view first.');
            }
        }
    });

    plugin.addCommand({
        id: 'clear-daily-stack',
        name: 'Clear Daily Stack',
        callback: async () => {
            const confirmed = await (window as any).confirm('Are you sure you want to clear the entire daily stack?');
            if (!confirmed) return;

            plugin.logger.info('[main] Clearing Daily Stack');
            const persistencePath = `${plugin.settings.targetFolder}/CurrentStack.md`;
            await plugin.stackPersistenceService.saveStack([], persistencePath);

            const leaf = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_STACK)[0];
            if (leaf && leaf.view && (leaf.view as any).reload) {
                await (leaf.view as any).reload();
            }
            new (window as any).Notice('Daily Stack cleared.');
        }
    });

    plugin.addCommand({
        id: 'sync-completed-tasks',
        name: 'Sync Completed Tasks from Current Export',
        callback: async () => {
            const activeLeaf = plugin.app.workspace.activeLeaf;
            if (!activeLeaf || !activeLeaf.view || activeLeaf.view.getViewType() !== 'markdown') {
                new (window as any).Notice('Open a markdown export file to sync.');
                return;
            }

            const editor = (activeLeaf.view as any).editor;
            if (editor) {
                const content = editor.getValue();
                const { SyncService } = await import('../services/SyncService.js');
                const service = new SyncService(plugin.app);
                const count = await service.syncExportToVault(content);
                if (count > 0) {
                    new Notice(`Synced ${count} tasks back to their original notes.`);
                } else {
                    new Notice('No matching tasks found to sync.');
                }
            }
        }
    });

    plugin.addCommand({
        id: 'add-linked-docs-to-stack',
        name: 'Add Linked Docs to Stack',
        callback: async () => {
            const activeFile = plugin.app.workspace.getActiveFile();
            if (!activeFile) {
                new Notice('Open a file first to import links.');
                return;
            }

            const { SmartImportService } = await import('../services/SmartImportService.js');
            const service = new SmartImportService(plugin.app, plugin.logger);
            const count = await service.importLinksToDailyStack(activeFile.path, plugin.settings.targetFolder);

            if (count > 0) {
                new Notice(`Added ${count} tasks to daily stack.`);
                const persistencePath = `${plugin.settings.targetFolder}/CurrentStack.md`;
                const savedIds = await plugin.stackPersistenceService.loadStackIds(persistencePath);
                await plugin.activateStack(savedIds, persistencePath);
            } else {
                new Notice('No new linked tasks found.');
            }
        }
    });

    plugin.addCommand({
        id: 'export-current-stack',
        name: 'Export to Note',
        callback: async () => {
            const leaves = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_STACK);
            if (leaves.length === 0 || !leaves[0]) {
                new Notice('Open the Stack View first.');
                return;
            }
            const stackView = leaves[0].view as StackView;
            const tasks = stackView.getTasks();

            const { ExportService } = await import('../services/ExportService.js');
            const exportService = new ExportService();
            const content = exportService.formatExport(tasks);

            if (plugin.settings.exportFolder) {
                try {
                    const fileName = `Export-${moment().format('YYYY-MM-DD-HHmm')}.md`;
                    const folderPath = plugin.settings.exportFolder.endsWith('/') ? plugin.settings.exportFolder : plugin.settings.exportFolder + '/';
                    const fullPath = folderPath + fileName;
                    await plugin.app.vault.create(fullPath, content);
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

    plugin.addCommand({
        id: 'toggle-timing-mode',
        name: 'Toggle Timing Mode (Now vs Fixed)',
        callback: () => {
            plugin.settings.timingMode = plugin.settings.timingMode === 'now' ? 'fixed' : 'now';
            plugin.saveSettings();
            plugin.refreshStackView();
            new (window as any).Notice(`Timing Mode: ${plugin.settings.timingMode === 'now' ? 'Dynamic (Now)' : 'Fixed (' + plugin.settings.fixedStartTime + ')'}`);
        }
    });

    plugin.addCommand({
        id: 'toggle-dev-mode',
        name: 'Toggle Developer Mode (Tracing)',
        callback: () => {
            plugin.settings.debug = !plugin.settings.debug;
            plugin.logger.setEnabled(plugin.settings.debug);
            plugin.saveSettings();
            new (window as any).Notice(`Developer Mode: ${plugin.settings.debug ? 'ON' : 'OFF'}`);
        }
    });

    plugin.addCommand({
        id: 'clear-logs',
        name: 'Clear Log File',
        callback: async () => {
            if (await plugin.app.vault.adapter.exists('todo-flow.log')) {
                await plugin.app.vault.adapter.write('todo-flow.log', '');
                new (window as any).Notice('Logs cleared');
            }
        }
    });

    plugin.addCommand({
        id: 'open-folder-as-stack',
        name: 'Open Folder as Stack',
        callback: async () => {
            const { FolderSuggester } = await import('../ui/Suggesters.js');
            new FolderSuggester(plugin.app, (folder) => {
                plugin.activateStack(folder.path);
            }).open();
        }
    });

    plugin.addCommand({
        id: 'open-file-as-stack',
        name: 'Open File as Stack',
        callback: async () => {
            const { FileSuggester } = await import('../ui/Suggesters.js');
            new FileSuggester(plugin.app, (file) => {
                plugin.activateStack(file.path);
            }).open();
        }
    });

    plugin.addCommand({
        id: 'triage-folder',
        name: 'Triage Folder',
        callback: async () => {
            const { FolderSuggester } = await import('../ui/Suggesters.js');
            new FolderSuggester(plugin.app, async (folder) => {
                new Notice(`Triage: Processing ${folder.name}...`);
                const tasks = await plugin.getTasksFromFolder(folder.path);
                if (tasks.length === 0) {
                    new (window as any).Notice('No markdown files in folder!');
                    return;
                }
                plugin.activateTriage(tasks);
            }).open();
        }
    });

    plugin.addCommand({
        id: 'triage-file',
        name: 'Triage File',
        callback: async () => {
            const { FileSuggester } = await import('../ui/Suggesters.js');
            new FileSuggester(plugin.app, async (file) => {
                plugin.logger.info(`[main.ts] Triage File: Selected ${file.path}. Resolving child tasks...`);
                const { StackLoader } = await import('../loaders/StackLoader.js');
                const loader = new StackLoader(plugin.app, plugin.logger);
                const taskNodes = await loader.load(file.path);

                if (taskNodes.length === 0) {
                    new (window as any).Notice('No tasks found linked in this file!');
                    return;
                }

                plugin.activateTriage(taskNodes);
            }).open();
        }
    });

    plugin.addCommand({
        id: 'open-settings',
        name: 'Open Settings',
        callback: () => {
            plugin.logger.info('[Command] Executing open-settings');
            if ((plugin.app as any).setting && (plugin.app as any).setting.openTabById) {
                (plugin.app as any).setting.open();
                (plugin.app as any).setting.openTabById('todo-flow');
            } else {
                (plugin.app as any).commands.executeCommandById('app:open-settings');
            }
        }
    });

    plugin.addCommand({
        id: 'insert-stack-at-cursor',
        name: 'Insert Current Stack at Cursor',
        editorCallback: async (editor: any, view: any) => {
            plugin.logger.info('[Command] Executing insert-stack-at-cursor');
            const leaves = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_STACK);
            if (leaves.length === 0) {
                new (window as any).Notice('Open the Task Stack view first.');
                return;
            }
            const leaf = leaves[0];
            if (!leaf) return;
            const stackView = leaf.view as StackView;
            const tasks = stackView.tasks;
            if (!tasks || tasks.length === 0) {
                new (window as any).Notice('Stack is empty or not loaded.');
                return;
            }
            const content = serializeStackToMarkdown(tasks);
            editor.replaceSelection(content);
            new (window as any).Notice('Stack inserted!');
        }
    });
}
