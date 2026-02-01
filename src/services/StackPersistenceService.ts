import { App, TFile } from 'obsidian';
import type { TaskNode } from '../scheduler.js';

export class StackPersistenceService {
    private lastInternalWriteTime: number = 0;

    constructor(private app: App) { }

    async saveStack(tasks: TaskNode[], filePath: string): Promise<void> {
        let content = `# Current Stack\n\n`;

        for (const task of tasks) {
            const checkbox = task.status === 'done' ? '[x]' : '[ ]';
            content += `- ${checkbox} [[${task.id}]]\n`;
        }

        // Update internal write time BEFORE writing to avoid race with watcher
        this.lastInternalWriteTime = Date.now();

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

    isExternalUpdate(filePath: string): boolean {
        // If we haven't written yet, any update is external
        if (this.lastInternalWriteTime === 0) return true;

        const now = Date.now();
        const diff = now - this.lastInternalWriteTime;

        // If the update happened within 2 seconds of our own write, 
        // it's likely our own write or a delayed event from it.
        // This is a heuristic, but usually reliable for local file systems.
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
