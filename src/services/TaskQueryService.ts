import type { App, TFile } from 'obsidian';
import { GraphBuilder } from '../GraphBuilder.js';
import { type TaskNode } from '../scheduler.js';

import { FileLogger } from '../logger.js';

export class TaskQueryService {
    constructor(private app: App, private logger?: FileLogger) { }

    async getDumpedTasks(): Promise<TaskNode[]> {
        return this.queryTasksByFlowState('dump');
    }

    async getShortlistedTasks(): Promise<TaskNode[]> {
        return this.queryTasksByFlowState('shortlist');
    }

    private async queryTasksByFlowState(state: string): Promise<TaskNode[]> {
        const files = this.app.vault.getFiles();
        if (this.logger) await this.logger.info(`[TaskQueryService] Searching for flow_state="${state}" in ${files.length} files...`);
        const matches = files.filter(file => {
            const cache = this.app.metadataCache.getCache(file.path);
            const flowState = cache?.frontmatter?.flow_state;

            if (flowState === state) {
                if (this.logger) this.logger.info(`[TaskQueryService] MATCH: ${file.path} has flow_state="${flowState}"`);
                return true;
            }
            return false;
        });
        if (this.logger) await this.logger.info(`[TaskQueryService] Found ${matches.length} matches for "${state}".`);

        // Use GraphBuilder to construct full nodes (with children if they exist)
        const builder = new GraphBuilder(this.app);
        return builder.buildGraph(matches);
    }
}
