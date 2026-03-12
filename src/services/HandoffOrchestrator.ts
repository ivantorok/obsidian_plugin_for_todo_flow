import { App, WorkspaceLeaf, TFile, TFolder, Notice } from 'obsidian';
import { type TaskNode } from '../scheduler.js';
import { TriageView, VIEW_TYPE_TRIAGE } from '../views/TriageView.js';
import { StackView, VIEW_TYPE_STACK } from '../views/StackView.js';
import { VIEW_TYPE_DUMP } from '../views/DumpView.js';
import moment from 'moment';
import { updateMetadataField, generateFilename } from '../persistence.js';
import { GraphBuilder } from '../GraphBuilder.js';
import { ExportService } from './ExportService.js';
import { type TodoFlowSettings } from '../settings.js';
import { FileLogger } from '../logger.js';
import { HistoryManager } from '../history.js';
import { ViewManager } from '../ViewManager.js';
import { StackPersistenceService } from './StackPersistenceService.js';

export class HandoffOrchestrator {
    constructor(
        private app: App,
        private settings: TodoFlowSettings,
        private historyManager: HistoryManager,
        private logger: FileLogger,
        private viewManager: ViewManager,
        private stackPersistenceService: StackPersistenceService,
        private saveData: (data: any) => Promise<void>
    ) { }

    async activateView(viewType: string, props?: any) {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf;
        const leaves = workspace.getLeavesOfType(viewType);

        if (leaves.length > 0) {
            leaf = leaves[0]!;
        } else {
            leaf = workspace.getLeaf(true);
            await leaf.setViewState({ type: viewType, active: true });
        }

        workspace.revealLeaf(leaf);
        workspace.setActiveLeaf(leaf, { focus: true });
    }

    async activateTriage(tasks: TaskNode[]) {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_TRIAGE);

        if (leaves.length > 0) {
            leaf = leaves[0]!;
            this.logger.info(`[HandoffOrchestrator] Reusing existing TriageView leaf.`);
        } else {
            this.logger.info(`[HandoffOrchestrator] Creating new TriageView leaf.`);
            leaf = workspace.getLeaf('tab');
        }

        this.logger.info(`[HandoffOrchestrator] activateTriage: Initializing session with ${tasks.length} tasks.`);

        const persistencePath = `${this.settings.targetFolder}/CurrentStack.md`;

        const view = new TriageView(
            leaf,
            tasks,
            this.settings,
            this.historyManager,
            this.logger,
            this.viewManager,
            async (results: { shortlist: TaskNode[], notNow: TaskNode[], strategy?: 'merge' | 'overwrite' }) => {
                let ids = results.shortlist.map((t: TaskNode) => t.id);
                this.logger.info(`[HandoffOrchestrator] Triage callback: Received ${ids.length} shortlisted tasks. Strategy: ${results.strategy || 'default'}`);

                // 1. Conflict / Merge Handling
                if (results.strategy === 'merge') {
                    const existingIds = await this.stackPersistenceService.loadStackIds(persistencePath);
                    const mergedMap = new Set(existingIds);
                    ids.forEach(id => mergedMap.add(id));
                    ids = Array.from(mergedMap);
                    this.logger.info(`[HandoffOrchestrator] MERGE Strategy: existing=${existingIds.length} + new=${results.shortlist.length} -> result=${ids.length}`);
                }

                // 2. Auto-Backup
                if (await this.app.vault.adapter.exists(persistencePath)) {
                    try {
                        const existingStackSrc = await this.stackPersistenceService.loadStackIds(persistencePath);
                        if (existingStackSrc.length > 0) {
                            const { StackLoader } = await import('../loaders/StackLoader.js');
                            const loader = new StackLoader(this.app, this.logger);
                            const oldTasks = await loader.loadSpecificFiles(existingStackSrc);

                            const exportService = new ExportService();
                            const backupContent = exportService.formatExport(oldTasks);
                            const backupPath = `${this.settings.targetFolder}/Backups/Backup-${moment().format('YYYY-MM-DD-HHmmss')}.md`;

                            if (!(await this.app.vault.adapter.exists(`${this.settings.targetFolder}/Backups`))) {
                                await this.app.vault.adapter.mkdir(`${this.settings.targetFolder}/Backups`);
                            }

                            await this.app.vault.create(backupPath, backupContent);
                            this.logger.info(`[HandoffOrchestrator] Auto-Backup created at ${backupPath}`);
                        }
                    } catch (e) {
                        this.logger.error(`[HandoffOrchestrator] Backup failed: ${e}`);
                    }
                }

                // 3. Save Final Stack
                await this.stackPersistenceService.saveStack(ids.map(id => ({ id, title: 'Ref', status: 'todo', children: [] } as any)), persistencePath, true);

                // 4. Update the active view
                const activeView = workspace.getLeavesOfType(VIEW_TYPE_STACK)
                    .map(l => l.view as StackView)
                    .find(v => v.getState().path === persistencePath);

                if (activeView) {
                    this.logger.info(`[HandoffOrchestrator] Triage complete: Refreshing active StackView for ${persistencePath}`);
                    activeView.reload();
                }

                new Notice(`Triage Complete: ${results.shortlist.length} tasks shortlisted.`);

                // 5. AUTO-START STACK
                this.stackPersistenceService.silence(persistencePath, 2000);
                this.logger.info(`[HandoffOrchestrator] Handoff Trace: Calling activateStack with ${ids.length} IDs.`);
                await this.activateStack(ids, persistencePath);
            },
            async (title: string, options?: any) => await this.onCreateTask(title, options),
            this.stackPersistenceService,
            persistencePath,
            async () => {
                try {
                    const exists = await this.app.vault.adapter.exists(persistencePath);
                    let currentIds: string[] = [];
                    if (exists) {
                        currentIds = await this.stackPersistenceService.loadStackIds(persistencePath);
                    }
                    return exists && currentIds.length > 0;
                } catch (e) {
                    this.logger.error(`[HandoffOrchestrator] checkForConflict error: ${e}`);
                    return false;
                }
            }
        );
        await leaf.open(view);
        workspace.revealLeaf(leaf);
        workspace.setActiveLeaf(leaf, { focus: true });
    }

    async activateStack(input: string | string[], backingFile?: string) {
        const { workspace } = this.app;
        let leaf: WorkspaceLeaf;

        this.logger.info(`[HandoffOrchestrator] activateStack target: ${Array.isArray(input) ? `EXPLICIT LIST (${input.length} IDs)` : input}`);

        const leaves = workspace.getLeavesOfType(VIEW_TYPE_STACK);
        if (leaves.length > 0) {
            leaf = leaves[0]!;
            this.logger.info(`[HandoffOrchestrator] Reusing existing StackView leaf.`);
        } else {
            this.logger.info(`[HandoffOrchestrator] Creating new StackView leaf.`);
            leaf = workspace.getLeaf('tab');
        }

        let state: any = { active: true };

        if (Array.isArray(input)) {
            this.settings.lastTray = input;
            await this.saveData(this.settings);

            state.state = { ids: input };
            if (backingFile) {
                state.state.rootPath = backingFile;
            }
        } else {
            if (backingFile) {
                this.logger.info(`[HandoffOrchestrator] Resolving source "${input}" for backing file "${backingFile}"`);
                const { StackLoader } = await import('../loaders/StackLoader.js');
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
        workspace.setActiveLeaf(leaf, { focus: true });
    }

    async syncTaskToNote(task: TaskNode) {
        const ownDuration = task.originalDuration ?? task.duration;
        this.logger.info(`[HandoffOrchestrator] Syncing Task Metadata to Disk: ID=${task.id} | Title="${task.title}"`);

        // BUG FIX: Update loadedAt IMMEDIATELY (synchronously) so subsequent immediate edits 
        // (e.g. rapid scaling) don't get rejected by our own mtime bump. If we await anything first,
        // Svelte's proxy or UI might copy the object.
        task._loadedAt = Date.now() + 2000;

        let filePath = task.id;
        if (!filePath.endsWith('.md')) filePath += '.md';

        let file = this.app.vault.getAbstractFileByPath(filePath);
        if (!(file instanceof TFile) && !filePath.includes('/')) {
            const prefixed = `${task.rootPath || this.settings.targetFolder}/${filePath}`.replace(/\/\//g, '/');
            file = this.app.vault.getAbstractFileByPath(prefixed);
        }

        if (!(file instanceof TFile)) return;

        this.stackPersistenceService.recordInternalWrite(file.path);

        const stats = await this.app.vault.adapter.stat(file.path);

        if (stats && task._loadedAt && stats.mtime > task._loadedAt) {
            this.logger.warn(`[Conflict Resolution] Rejecting sync for ${task.title}. Disk is newer.`);
            return;
        }

        try {
            await this.app.vault.process(file as TFile, (content) => {
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
        } catch (e) {
            this.logger.error(`[HandoffOrchestrator] syncTaskToNote FAILED for ID=${task.id}. Error: ${e}`);
        }
    }

    async onCreateTask(title: string, options?: { startTime?: moment.Moment | undefined, duration?: number | undefined, isAnchored?: boolean | undefined, parentPath?: string | undefined }): Promise<TaskNode> {
        const folderPath = this.settings.targetFolder;
        if (!(await this.app.vault.adapter.exists(folderPath))) {
            try {
                await this.app.vault.createFolder(folderPath);
            } catch (e) { }
        }

        const filename = generateFilename(title);
        const path = `${folderPath}/${filename}`;

        const duration = options?.duration ?? 30;
        const isAnchored = options?.isAnchored ?? false;
        const startTime = options?.startTime;

        const newNode: TaskNode = {
            id: path,
            title: title,
            duration: duration,
            status: 'todo',
            isAnchored: isAnchored,
            startTime: startTime,
            children: [],
            _loadedAt: Date.now()
        };

        const timestamp = moment().format('YYYY-MM-DD HH:mm');
        let fileContent = `---\ntask: ${title}\nstatus: todo\nduration: ${duration}\nadded: ${timestamp}`;
        if (isAnchored) {
            fileContent += `\nanchored: true`;
            if (startTime) {
                fileContent += `\nstartTime: ${startTime.format('YYYY-MM-DD HH:mm')}`;
            }
        }
        fileContent += `\n---\n# ${title}`;

        this.stackPersistenceService.recordInternalWrite(path);
        await this.app.vault.create(path, fileContent);

        if (options?.parentPath) {
            await this.injectLinkToParent(options.parentPath, path, title);
        }

        return newNode;
    }

    async injectLinkToParent(parentPath: string, childPath: string, childTitle: string) {
        this.logger.info(`[HandoffOrchestrator] injectLinkToParent starting. parentPath: "${parentPath}", childPath: "${childPath}"`);
        const parentFile = this.app.vault.getAbstractFileByPath(parentPath);
        if (!(parentFile instanceof TFile)) {
            this.logger.error(`[HandoffOrchestrator] injectLinkToParent FAILED. getAbstractFileByPath returned ${parentFile} for path: "${parentPath}"`);
            return;
        }

        const linkLine = `\n- [ ] [[${childPath}|${childTitle}]]`;

        this.stackPersistenceService.recordInternalWrite(parentPath);
        const content = await this.app.vault.read(parentFile);
        const result = content.trimEnd() + linkLine;
        await this.app.vault.modify(parentFile, result);
        this.logger.info(`[HandoffOrchestrator] injectLinkToParent SUCCESS. Parent size now ${result.length} chars.`);
    }

    async getTasksFromFolder(folderPath: string): Promise<TaskNode[]> {
        const files = await this.getFilesFromFolder(folderPath);
        const builder = new GraphBuilder(this.app);
        return builder.buildGraph(files);
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
}
