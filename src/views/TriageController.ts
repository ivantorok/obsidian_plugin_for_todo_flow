import { type TaskNode } from '../scheduler.js';
import type { App, TFile } from 'obsidian';
import { updateMetadataField } from '../persistence.js';
import { FileLogger } from '../logger.js';

export interface TriageResults {
    shortlist: TaskNode[];
    notNow: TaskNode[];
}

interface TriageState {
    index: number;
    shortlistIndices: Set<number>;
    notNowIndices: Set<number>;
}

export class TriageController {
    private index = 0;
    private shortlistIndices = new Set<number>();
    private notNowIndices = new Set<number>();
    private liveFiles: any[] = []; // SPIKE: Any to avoid import issues for now
    private logger: FileLogger | undefined;

    constructor(private app: App, private tasks: TaskNode[], logger?: FileLogger) {
        this.logger = logger;
        if (this.logger) this.logger.info(`[TriageController] Initialized with ${tasks.length} tasks.`);
    }

    addTask(task: TaskNode) {
        if (this.logger) this.logger.info(`[TriageController] addTask entry: ${task.title}, Index: ${this.index}, Total Tasks before: ${this.tasks.length}`);
        this.tasks.push(task);
        if (this.logger) this.logger.info(`[TriageController] Added task to queue: ${task.title}. Total tasks: ${this.tasks.length}`);
    }

    getCurrentTask(): TaskNode | null {
        if (this.index >= this.tasks.length) return null;
        return this.tasks[this.index]!;
    }

    async openCurrentTask() {
        const task = this.getCurrentTask();
        if (!task) return;

        // Open the file in a new leaf (true) or current? 
        // User workflow: "Enter to Edit". Usually implies "Go here".
        // If we open in same leaf, we lose Triage View state? 
        // Triage View is a Leaf. If we navigate "self", we destroy Triage.
        // User wants to come *back* to Triage.
        // So we probably want a new leaf (tab) or split.
        // Let's use `true` (new leaf/tab) for now as it's safer.
        await this.app.workspace.openLinkText(task.id, '', true);
    }

    async swipeRight() {
        if (this.index >= this.tasks.length) return;
        const task = this.tasks[this.index]!;
        this.shortlistIndices.add(this.index);

        // Persist "shortlist" state
        if (this.logger) await this.logger.info(`[TriageController] Swiping Right on ${task.id} (flow_state -> shortlist)`);
        await this.updateFlowState(task.id, 'shortlist');

        this.index++;
    }

    async swipeLeft() {
        // "Not Now" stays in dump or moves to backlog? 
        // For now, let's assume it keeps "dump" state or explicitly sets "dump" (no-op if already dump).
        if (this.index >= this.tasks.length) return;
        this.notNowIndices.add(this.index);
        this.index++;
    }

    private async updateFlowState(path: string, state: string) {
        if (this.logger) await this.logger.info(`[TriageController] updateFlowState: Setting ${path} to "${state}"`);
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file && (file as any).extension === 'md') {
            await this.app.vault.process(file as TFile, (content) => {
                return updateMetadataField(content, 'flow_state', state);
            });
        }
    }


    getResults(): TriageResults {
        return {
            shortlist: this.tasks.filter((_, i) => this.shortlistIndices.has(i)),
            notNow: this.tasks.filter((_, i) => this.notNowIndices.has(i))
        };
    }
}
