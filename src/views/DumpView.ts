import { ItemView, WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import DumpViewSvelte from './DumpView.svelte';
import { type TaskNode } from '../scheduler.js';
import { FileLogger } from '../logger.js';

export const VIEW_TYPE_DUMP = "todo-flow-dump-view";

export class DumpView extends ItemView {
    component: any;
    settings: any; // TodoFlowSettings
    logger: FileLogger;
    onComplete: (tasks: TaskNode[]) => void;

    constructor(leaf: WorkspaceLeaf, settings: any, logger: FileLogger, onComplete: (tasks: TaskNode[]) => void) {
        super(leaf);
        this.settings = settings;
        this.logger = logger;
        this.onComplete = onComplete;
    }

    getViewType() {
        return VIEW_TYPE_DUMP;
    }

    getDisplayText() {
        return "Todo Dump";
    }

    async onOpen() {
        this.component = mount(DumpViewSvelte, {
            target: this.contentEl,
            props: {
                app: this.app,
                folder: this.settings.targetFolder, // Pass dynamic value
                logger: this.logger,
                onComplete: (tasks: TaskNode[]) => {
                    this.onComplete(tasks);
                    // Close dump view after completion
                    this.leaf.detach();
                }
            }
        });
    }

    async onClose() {
        if (this.component) {
            unmount(this.component);
        }
    }
}
