import { App, TFile } from 'obsidian';
import type { TaskNode } from '../scheduler.js';

export class StackPersistenceService {
    constructor(private app: App) { }

    async saveStack(tasks: TaskNode[], filePath: string): Promise<void> {
        let content = `# Current Stack\n\n`;

        for (const task of tasks) {
            const checkbox = task.status === 'done' ? '[x]' : '[ ]';
            content += `- ${checkbox} [[${task.id}]]\n`;
        }

        const file = this.app.vault.getAbstractFileByPath(filePath);

        if (file) {
            await this.app.vault.modify(file as TFile, content);
        } else {
            await this.app.vault.create(filePath, content);
        }
    }

    async loadStackIds(filePath: string): Promise<string[]> {
        const file = this.app.vault.getAbstractFileByPath(filePath);

        if (!file) {
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
                    ids.push(parts[0]);
                }
            }
        }

        return ids;
    }
}
