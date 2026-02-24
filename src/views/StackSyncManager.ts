import { TFile, App } from "obsidian";
import { type FileLogger } from "../logger.js";
import { type StackPersistenceService } from "../services/StackPersistenceService.js";
import { type NavigationManager } from "../navigation/NavigationManager.js";
import { type ProcessGovernor } from "../services/ProcessGovernor.js";
import { type TaskNode } from "../scheduler.js";

export interface SyncManagerConfig {
    app: App;
    logger: FileLogger;
    persistenceService: StackPersistenceService;
    navManager: NavigationManager;
    governor: ProcessGovernor | undefined;
    getTasks: () => TaskNode[];
    getRootPath: () => string | null;
    getCurrentTaskIds: () => string[] | null;
    settings: any;
    setIsSyncing: (val: boolean) => void;
    registerEvent?: (ref: any) => void;
    triggerViewReload: () => void;
}

export class StackSyncManager {
    private isSyncing = false;
    private reloadTimeout: number | null = null;
    private isReloadPending = false;
    private syncCheckInterval: number | null = null;
    private pendingSyncs: Set<Promise<void>> = new Set();

    // Persistence state
    private lastTasksForSave: TaskNode[] | null = null;
    private saveTimeout: number | null = null;
    private flushResolvers: (() => void)[] = [];
    private persistenceLockCount: number = 0;
    private lastSavedIds: string[] = [];

    constructor(private config: SyncManagerConfig) {
        this.setupSyncSentry();
        this.registerChangeListeners();
    }

    private setupSyncSentry() {
        const checkSync = () => {
            const syncPlugin = (this.config.app as any).internalPlugins?.getPluginById('sync');
            const isActive = syncPlugin?.instance?.status === 'syncing' ||
                syncPlugin?.instance?.status === 'downloading' ||
                syncPlugin?.instance?.status === 'uploading';

            if (isActive !== this.isSyncing) {
                this.isSyncing = isActive;
                this.config.setIsSyncing(this.isSyncing);
            }
        };

        this.syncCheckInterval = window.setInterval(checkSync, 2000);
        checkSync();
    }

    private registerChangeListeners() {
        const ref = this.config.app.metadataCache.on('changed', async (file) => {
            if (!(file instanceof TFile)) return;

            const rootPath = this.config.getRootPath();
            const tasks = this.config.getTasks();

            if (rootPath && file.path === rootPath) {
                const isExternal = await this.config.persistenceService.isExternalUpdate(file.path, tasks);
                if (isExternal) {
                    if (this.config.logger) this.config.logger.info(`[StackSyncManager] External change detected on BACKING FILE ${file.path}. Triggering sync reload.`);
                    this.triggerSyncReload(this.isSyncing ? 3000 : 500);
                }
                return;
            }

            const taskIndex = tasks.findIndex(t => t.id === file.path);
            if (taskIndex !== -1) {
                const isExternal = await this.config.persistenceService.isExternalUpdate(file.path, tasks);
                if (!isExternal) return;

                if (this.config.logger) this.config.logger.info(`[StackSyncManager] External change detected for task ${file.path}. Triggering sync reload.`);
                this.triggerSyncReload(this.isSyncing ? 3000 : 500);
            }
        });

        if (this.config.registerEvent) {
            this.config.registerEvent(ref);
        }
    }

    public triggerSyncReload(ms: number) {
        if (this.reloadTimeout) window.clearTimeout(this.reloadTimeout as any);
        this.reloadTimeout = window.setTimeout(async () => {
            if (this.isReloadPending) return;
            this.isReloadPending = true;

            try {
                await this.flushPersistence();

                if (this.config.logger) this.config.logger.info(`[StackSyncManager] Executing sync reload from disk.`);
                await this.config.navManager.refresh();
            } finally {
                this.isReloadPending = false;
            }
        }, ms) as any;
    }

    public async flushPersistence(): Promise<void> {
        if (this.pendingSyncs.size > 0) {
            if (this.config.logger) this.config.logger.info(`[StackSyncManager] Draining ${this.pendingSyncs.size} pending task syncs before flush.`);
            await Promise.all(this.pendingSyncs);
        }

        if (!this.saveTimeout) return;
        if (this.config.logger) this.config.logger.info(`[StackSyncManager] Flush requested.`);

        if (this.saveTimeout) {
            window.clearTimeout(this.saveTimeout);
            await this.performSave();
        }

        return new Promise((resolve) => {
            this.flushResolvers.push(resolve);
            if (!this.saveTimeout) {
                const resolvers = [...this.flushResolvers];
                this.flushResolvers = [];
                resolvers.forEach(res => res());
            }
        });
    }

    public lockPersistence(path: string, token: string) {
        this.persistenceLockCount++;
        this.config.persistenceService.claimLock(path, token);
        if (this.config.governor) this.config.governor.claimInteraction();
        if (this.config.logger && this.config.settings.debug) this.config.logger.info(`[StackSyncManager] Persistence LOCKED for ${path} (token: ${token}, count: ${this.persistenceLockCount})`);
    }

    public unlockPersistence(path: string, token: string) {
        this.persistenceLockCount = Math.max(0, this.persistenceLockCount - 1);
        this.config.persistenceService.releaseLock(path, token);
        if (this.config.governor) this.config.governor.releaseInteraction();
        if (this.config.logger && this.config.settings.debug) this.config.logger.info(`[StackSyncManager] Persistence UNLOCKED for ${path} (token: ${token}, count: ${this.persistenceLockCount})`);

        if (this.persistenceLockCount === 0) {
            if (this.isReloadPending) {
                if (this.config.logger) this.config.logger.info(`[StackSyncManager] interaction-idle: triggering DEFERRED reload`);
                this.config.triggerViewReload();
            } else if (this.saveTimeout) {
                if (this.config.logger && this.config.settings.debug) this.config.logger.info(`[StackSyncManager] interaction-idle: triggering pending save`);
                this.triggerSave(0);
            }
        }
    }

    public triggerSave(ms: number) {
        if (this.saveTimeout) window.clearTimeout(this.saveTimeout);

        if (this.persistenceLockCount > 0) {
            if (this.config.logger) this.config.logger.info(`[StackSyncManager] Save DEFERRED: active interaction lock`);
            this.saveTimeout = 1 as any;
            return;
        }

        this.saveTimeout = window.setTimeout(() => this.performSave(), ms) as any;
    }

    private async performSave() {
        if (!this.lastTasksForSave) return;
        const tasks = this.lastTasksForSave;
        const currentIds = tasks.map(t => `${t.id}:${t.status}`);
        const persistencePath = `${this.config.settings.targetFolder}/CurrentStack.md`;
        const rootPath = this.config.getRootPath();
        const savePath = (rootPath && rootPath.includes('CurrentStack.md')) ? rootPath : persistencePath;
        const isCurrentlyViewingShortlist = rootPath === persistencePath || (rootPath && rootPath.includes('CurrentStack.md'));
        const currentTaskIds = this.config.getCurrentTaskIds();

        try {
            if (isCurrentlyViewingShortlist || (currentTaskIds && currentTaskIds.length > 0)) {
                await this.config.persistenceService.saveStack(tasks, savePath);

                if (JSON.stringify(currentIds) === JSON.stringify(tasks.map(t => `${t.id}:${t.status}`))) {
                    this.lastSavedIds = currentIds;
                    if (this.config.logger && this.config.settings.debug) this.config.logger.info(`[StackSyncManager] Saved ${tasks.length} tasks to ${savePath}.`);
                }
            } else {
                if (this.config.logger && this.config.settings.debug) this.config.logger.info(`[StackSyncManager] Skipping save: Not viewing Shortlist (rootPath: ${rootPath})`);
            }
        } catch (e) {
            if (this.config.logger) this.config.logger.error(`[StackSyncManager] Failed to save stack list: ${e}`);
        } finally {
            this.saveTimeout = null;
            const resolvers = [...this.flushResolvers];
            this.flushResolvers = [];
            resolvers.forEach(res => res());
        }
    }

    public handleStackChange(tasks: TaskNode[]) {
        const persistencePath = `${this.config.settings.targetFolder}/CurrentStack.md`;
        const rootPath = this.config.getRootPath();
        const currentTaskIds = this.config.getCurrentTaskIds();

        if (rootPath === persistencePath || rootPath === 'CurrentStack.md' || (currentTaskIds && currentTaskIds.length > 0)) {
            if (tasks.length === 0 && (!this.lastSavedIds || this.lastSavedIds.length === 0)) return;
            const currentIds = tasks.map(t => `${t.id}:${t.status}`);
            const idsChanged = JSON.stringify(currentIds) !== JSON.stringify(this.lastSavedIds);

            if (idsChanged && !this.isReloadPending) {
                this.lastTasksForSave = tasks;
                this.triggerSave(500);
            }
        }
    }

    public setLastSavedIds(ids: string[]) {
        this.lastSavedIds = ids;
    }

    public trackSyncPromise(promise: Promise<void>) {
        this.pendingSyncs.add(promise);
        promise.finally(() => this.pendingSyncs.delete(promise));
    }

    public async drainSyncPromises() {
        if (this.pendingSyncs.size > 0) {
            await Promise.all(this.pendingSyncs);
        }
    }

    public isLocked(): boolean {
        return this.persistenceLockCount > 0;
    }

    public setReloadPending(pending: boolean) {
        this.isReloadPending = pending;
    }

    public destroy() {
        if (this.syncCheckInterval) window.clearInterval(this.syncCheckInterval);
        if (this.reloadTimeout) window.clearTimeout(this.reloadTimeout);
        if (this.saveTimeout) window.clearTimeout(this.saveTimeout);
    }
}
