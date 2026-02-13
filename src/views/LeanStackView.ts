import { ItemView, WorkspaceLeaf, TFile, Platform, Notice } from 'obsidian';
import { mount, unmount } from 'svelte';
import LeanStackViewSvelte from './LeanStackView.svelte';
import { type TaskNode } from '../scheduler.js';
import { FileLogger } from '../logger.js';
import { StackLoader } from '../loaders/StackLoader.js';
import { type TodoFlowSettings } from '../main.js';
import { StackPersistenceService } from '../services/StackPersistenceService.js';
import moment from 'moment';

export const VIEW_TYPE_STACK = "todo-flow-stack-view";

export class LeanStackView extends ItemView {
    component: any;
    tasks: TaskNode[] = [];
    settings: TodoFlowSettings;
    logger: FileLogger;
    persistenceService: StackPersistenceService;
    loader: StackLoader;
    onTaskUpdate: (task: TaskNode) => void | Promise<void>;
    private currentRootPath: string | null = null;

    constructor(leaf: WorkspaceLeaf, settings: TodoFlowSettings, logger: FileLogger, persistenceService: StackPersistenceService, onTaskUpdate: (task: TaskNode) => void | Promise<void>) {
        super(leaf);
        this.settings = settings;
        this.logger = logger;
        this.persistenceService = persistenceService;
        this.onTaskUpdate = onTaskUpdate;
        this.loader = new StackLoader(this.app, this.logger);
    }

    getViewType() {
        return VIEW_TYPE_STACK;
    }

    getDisplayText() {
        return "Daily Stack (Lean)";
    }

    async onOpen() {
        this.component = mount(LeanStackViewSvelte, {
            target: this.contentEl,
            props: {
                app: this.app,
                settings: this.settings,
                logger: this.logger,
                onTaskUpdate: this.onTaskUpdate,
                onAppendInbox: this.onAppendInbox.bind(this),
                onAppendStack: this.onAppendStack.bind(this)
            }
        });
    }

    async setState(state: any, result: any): Promise<void> {
        this.logger.info(`[LeanStackView] setState called: ${JSON.stringify(state)}`);
        if (state && (state.ids || state.rootPath)) {
            let tasks: TaskNode[] = [];
            if (state.rootPath) {
                this.currentRootPath = state.rootPath;
                tasks = await this.loader.load(state.rootPath);
            } else if (state.ids && Array.isArray(state.ids)) {
                tasks = await this.loader.loadSpecificFiles(state.ids);
            }

            if (this.component) {
                this.component.setTasks(tasks, false);
            }
        }
        await super.setState(state, result);
    }

    async onAppendInbox(text: string) {
        const inboxPath = `Mobile_Inbox.md`;
        await this.appendToFile(inboxPath, text);
        this.logger.info(`[LeanStackView] Appended to Inbox: ${text}`);
    }

    async onAppendStack(text: string) {
        if (!this.currentRootPath) {
            this.logger.error("[LeanStackView] Cannot append to stack: currentRootPath is null");
            return;
        }
        await this.appendToFile(this.currentRootPath, text);
        this.logger.info(`[LeanStackView] Appended to Stack (${this.currentRootPath}): ${text}`);
        new Notice(`Captured: ${text}`);

        // Wait for vault to sync/notice file change
        await new Promise(resolve => setTimeout(resolve, 300));

        // Reload tasks to show the new one
        const tasks = await this.loader.load(this.currentRootPath);
        this.logger.info(`[LeanStackView] Reloaded stack, now has ${tasks.length} tasks`);

        if (this.component) {
            this.component.setTasks(tasks, false);
        }
    }

    private async appendToFile(path: string, text: string) {
        const exists = await this.app.vault.adapter.exists(path);
        const folder = path.includes('/') ? path.split('/').slice(0, -1).join('/') : '';

        // Use folder-relative link if in a folder
        const linkText = folder ? `${folder}/${text}` : text;
        const line = `\n- [ ] [[${linkText}]]`;

        if (exists) {
            const file = this.app.vault.getAbstractFileByPath(path);
            if (file instanceof TFile) {
                await this.app.vault.process(file, (content) => {
                    const base = content.endsWith('\n') ? content : content + '\n';
                    return base + line;
                });
            }
        } else {
            await this.app.vault.create(path, line);
        }

        // FEAT-005: Ensure the task file itself exists so it can be loaded into the Lean View
        const taskFilePath = folder ? `${folder}/${text}.md` : `${text}.md`;

        const taskFileExists = await this.app.vault.adapter.exists(taskFilePath);
        if (!taskFileExists) {
            await this.app.vault.create(taskFilePath, `# ${text}\n\nCaptured via Immersion Overlay.`);
        }
    }

    async onClose() {
        if (this.component) unmount(this.component);
    }
}
