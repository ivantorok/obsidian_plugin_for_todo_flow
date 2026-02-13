import { ItemView, WorkspaceLeaf, TFile, Platform } from 'obsidian';
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
                onAppendInbox: this.onAppendInbox.bind(this)
            }
        });
    }

    async setState(state: any, result: any): Promise<void> {
        this.logger.info(`[LeanStackView] setState called: ${JSON.stringify(state)}`);
        if (state && (state.ids || state.rootPath)) {
            let tasks: TaskNode[] = [];
            if (state.ids && Array.isArray(state.ids)) {
                tasks = await this.loader.loadSpecificFiles(state.ids);
            } else if (state.rootPath) {
                tasks = await this.loader.load(state.rootPath);
            }

            if (this.component) {
                this.component.setTasks(tasks);
            }
        }
        await super.setState(state, result);
    }

    async onAppendInbox(text: string) {
        const inboxPath = `Mobile_Inbox.md`;
        const exists = await this.app.vault.adapter.exists(inboxPath);
        const timestamp = moment().format('YYYY-MM-DD HH:mm');
        const line = `- [ ] ${timestamp} ${text}\n`;

        if (exists) {
            const file = this.app.vault.getAbstractFileByPath(inboxPath);
            if (file instanceof TFile) {
                await this.app.vault.process(file, (content) => content + line);
            }
        } else {
            await this.app.vault.create(inboxPath, line);
        }
        this.logger.info(`[LeanStackView] Appended to Inbox: ${text}`);
    }

    async onClose() {
        if (this.component) unmount(this.component);
    }
}
