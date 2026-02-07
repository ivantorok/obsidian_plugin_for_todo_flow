
import { App, WorkspaceLeaf } from 'obsidian';
import { StackView, VIEW_TYPE_STACK } from './views/StackView.js';
import { type FileLogger } from './logger.js';

export class ViewManager {
    app: App;
    logger: FileLogger;
    private activeLeafId: string | null = null;

    constructor(app: App, logger: FileLogger) {
        this.app = app;
        this.logger = logger;
    }

    async handleActiveLeafChange(): Promise<void> {
        const activeLeaf = (this.app.workspace as any).activeLeaf;
        if (activeLeaf) {
            this.activeLeafId = activeLeaf.id;
            this.logger.info(`[ViewManager] Active leaf tracked: ${this.activeLeafId}`);
        }

        // Existing reload logic for StackView
        // Initial reload logic removed to prevent E2E race conditions
        // @ts-ignore
        const activeView = this.app.workspace.getActiveViewOfType(StackView);

        if (activeView) {
            this.logger.info(`[ViewManager] Active leaf changed to StackView. Triggering Reload.`);
            if (typeof activeView.reload === 'function') {
                await activeView.reload();
            }
        }
    }

    isSovereign(leafId: string): boolean {
        if (!this.activeLeafId) {
            const activeLeaf = (this.app.workspace as any).activeLeaf;
            if (activeLeaf) {
                this.activeLeafId = activeLeaf.id;
            }
        }
        return this.activeLeafId === leafId;
    }
}
