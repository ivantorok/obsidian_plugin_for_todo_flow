import type { App } from 'obsidian';
import { generateFilename, updateMetadataField } from '../persistence.js';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';

export class DumpController {
    constructor(private app: App, private targetFolder: string) { }

    async submitThought(thought: string): Promise<TaskNode | null> {
        if (!thought.trim()) return null;

        await this.ensureFolderExists(this.targetFolder);

        const filename = generateFilename(thought);
        const path = `${this.targetFolder}/${filename}`;

        // Default content with metadata
        let content = `# ${thought}`;
        content = updateMetadataField(content, 'task', thought);
        content = updateMetadataField(content, 'status', 'todo');
        content = updateMetadataField(content, 'duration', 30);
        content = updateMetadataField(content, 'created', moment().format('YYYY-MM-DD HH:mm'));
        content = updateMetadataField(content, 'type', 'task');
        content = updateMetadataField(content, 'flow_state', 'dump');

        await this.app.vault.create(path, content);

        return {
            id: path,
            title: thought,
            status: 'todo',
            duration: 30,
            isAnchored: false,
            children: []
        };
    }

    private async ensureFolderExists(folderPath: string) {
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!folder) {
            await this.app.vault.createFolder(folderPath);
        }
    }
}
