import { App, TFile } from 'obsidian';
import type { TaskNode } from '../scheduler.js';

export class StackPersistenceService {
    private lastInternalWriteTime: number = 0;
    private fileWriteTimes: Map<string, number> = new Map();

    constructor(private app: App) { }

    async saveStack(tasks: TaskNode[], filePath: string): Promise<void> {
        const msg = `[StackPersistenceService] saveStack() path=${filePath}, count=${tasks.length}`;
        console.log(msg);
        if (typeof window !== 'undefined') {
            const existing = localStorage.getItem('_todo_flow_debug_logs') || '';
            localStorage.setItem('_todo_flow_debug_logs', existing + '\n' + msg);
        }
        let content = `# Current Stack\n\n`;

        for (const task of tasks) {
            const checkbox = task.status === 'done' ? '[x]' : '[ ]';
            content += `- ${checkbox} [[${task.id}]]\n`;
        }

        // Update internal write time BEFORE writing to avoid race with watcher
        this.recordInternalWrite(filePath);

        const file = this.app.vault.getAbstractFileByPath(filePath);

        // Ensure directory exists
        const lastSlash = filePath.lastIndexOf('/');
        if (lastSlash !== -1) {
            const folderPath = filePath.substring(0, lastSlash);
            if (!await this.app.vault.adapter.exists(folderPath)) {
                await this.app.vault.adapter.mkdir(folderPath);
            }
        }

        // Relaxed check for TFile to support mocks
        if (file && (file instanceof TFile || (file as any).extension === 'md')) {
            await this.app.vault.modify(file as TFile, content);
        } else {
            await this.app.vault.create(filePath, content);
        }
    }

    recordInternalWrite(filePath: string): void {
        const now = Date.now();
        this.lastInternalWriteTime = now;
        this.fileWriteTimes.set(filePath, now);
    }

    isExternalUpdate(filePath: string): boolean {
        // If we haven't written this specific file yet, any update is external
        const lastWrite = this.fileWriteTimes.get(filePath);
        if (!lastWrite) {
            // Fallback: If we haven't written ANYTHING yet, it's external
            if (this.lastInternalWriteTime === 0) return true;

            // If we have written other things recently, be cautious but likely it's external 
            // if this specific file hasn't been touched by us.
            // We'll trust the per-file check primarily.
            return true;
        }

        const now = Date.now();
        const diff = now - lastWrite;

        // If the update happened within 2 seconds of our own write to THIS file, 
        // it's likely our own write or a delayed event from it.
        return diff > 2000;
    }

    async loadStackIds(filePath: string): Promise<string[]> {
        const file = this.app.vault.getAbstractFileByPath(filePath);

        // Relaxed check for TFile to support mocks
        if (!file || !(file instanceof TFile || (file as any).extension === 'md')) {
            return [];
        }

        const content = await this.app.vault.read(file as TFile);

        const lines = content.split('\n');
        const ids: string[] = [];
        const linkRegex = /\[\[(.*?)\]\]/;

        for (const line of lines) {
            const match = line.match(linkRegex);
            if (match && match[1]) {
                const linkContent = match[1];
                const parts = linkContent.split('|');
                if (parts[0]) {
                    const linkText = parts[0];
                    let resolvedFile = this.app.metadataCache.getFirstLinkpathDest(linkText, filePath);

                    // Fallback: Try resolving relative to persistence file (for cold cache/tests)
                    if (!resolvedFile) {
                        const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
                        // Handle wiki links that might not have extension
                        const candidatePath = `${parentDir}/${linkText}.md`;
                        const file = this.app.vault.getAbstractFileByPath(candidatePath);
                        if (file instanceof TFile) {
                            resolvedFile = file;
                        }
                    }

                    if (resolvedFile) {
                        ids.push(resolvedFile.path);
                    } else {
                        ids.push(linkText);
                    }
                }
            }
        }

        return ids;
    }
}
