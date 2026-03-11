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
        const matches: TFile[] = [];
        for (const file of files) {
            const cache = this.app.metadataCache.getCache(file.path);
            let flowState = cache?.frontmatter?.flow_state;

            // Fallback: If cache is missing or frontmatter is empty, check file content directly
            // This is critical for E2E tests where files are created just before triage starts.
            if (!flowState) {
                const content = await this.app.vault.read(file);
                const match = content.match(/flow_state:\s*["']?(\w+)["']?/);
                if (match) flowState = match[1];
            }

            if (flowState === state) {
                if (this.logger) this.logger.info(`[TaskQueryService] MATCH: ${file.path} has flow_state="${flowState}"`);
                matches.push(file);
            }
        }
        if (this.logger) await this.logger.info(`[TaskQueryService] Found ${matches.length} matches for "${state}".`);

        // Use GraphBuilder to construct full nodes (with children if they exist)
        const builder = new GraphBuilder(this.app);
        return builder.buildGraph(matches);
    }
}
