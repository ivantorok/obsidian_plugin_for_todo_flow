import type { App } from 'obsidian';
import { generateFilename, updateMetadataField } from '../persistence.js';
import { type TaskNode } from '../scheduler.js';
import { DateParser } from '../utils/DateParser.js';
import { FileLogger } from '../logger.js';
import moment from 'moment';

export class DumpController {
    constructor(private app: App, private targetFolder: string, private logger?: FileLogger) { }

    async submitThought(thought: string): Promise<TaskNode | null> {
        if (this.logger) await this.logger.info(`[DumpController] submitThought entry: "${thought}"`);
        if (!thought.trim()) return null;

        await this.ensureFolderExists(this.targetFolder);

        // NLP Processing
        const parsed = DateParser.parseTaskInput(thought);
        const title = parsed.title;
        const duration = parsed.duration ?? 30;
        const isAnchored = parsed.isAnchored;
        const startTime = parsed.startTime;

        const filename = generateFilename(title);
        const path = `${this.targetFolder}/${filename}`;

        // Default content with metadata
        let content = `# ${title}`;
        content = updateMetadataField(content, 'task', title);
        content = updateMetadataField(content, 'status', 'todo');
        content = updateMetadataField(content, 'duration', duration);
        content = updateMetadataField(content, 'created', moment().format('YYYY-MM-DD HH:mm'));
        content = updateMetadataField(content, 'type', 'task');
        content = updateMetadataField(content, 'flow_state', 'dump');

        if (isAnchored) {
            content = updateMetadataField(content, 'anchored', true);
            if (startTime) {
                content = updateMetadataField(content, 'startTime', startTime.format('YYYY-MM-DD HH:mm'));
            }
        }

        if (this.logger) await this.logger.info(`[DumpController] Created task: ${path} (isAnchored: ${isAnchored}, startTime: ${startTime?.format('HH:mm')})`);

        await this.app.vault.create(path, content);

        return {
            id: path,
            title: title,
            status: 'todo',
            duration: duration,
            isAnchored: isAnchored,
            startTime: startTime ?? undefined,
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
