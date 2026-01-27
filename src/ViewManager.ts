
import { App, WorkspaceLeaf } from 'obsidian';
import { StackView, VIEW_TYPE_STACK } from './views/StackView.js';
import { type FileLogger } from './logger.js';

export class ViewManager {
    app: App;
    logger: FileLogger;

    constructor(app: App, logger: FileLogger) {
        this.app = app;
        this.logger = logger;
    }

    async handleActiveLeafChange(): Promise<void> {
        // We only care if the NEW active view is a StackView
        // Note: We use string check or class check. Class check is safer if imports work.
        // But for testing mocks, sometimes dynamic checks are harder.
        // Let's rely on getActiveViewOfType which is standard Obsidian API.

        // Is the currently active view a StackView?
        // We cast to any to avoid circular import issues in some contexts or strict type checking against the mock in tests,
        // but generally we should use the class.
        // @ts-ignore
        const activeView = this.app.workspace.getActiveViewOfType(StackView);

        if (activeView) {
            this.logger.info(`[ViewManager] Active leaf changed to StackView. Triggering Reload.`);
            if (typeof activeView.reload === 'function') {
                this.logger.info(`[ViewManager] Calling activeView.reload()...`);
                await activeView.reload();
            } else {
                this.logger.warn(`[ViewManager] StackView found but reload() method missing!`);
            }
        }
    }
}
