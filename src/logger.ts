import { type App } from 'obsidian';
import moment from 'moment';

declare const process: { env: { BUILD_ID: string } };

export class FileLogger {
    private LOG_FILE = 'todo-flow.log';
    private enabled: boolean;
    private app: App;
    private buildId: string;

    constructor(app: App, enabled: boolean) {
        this.app = app;
        this.enabled = enabled;
        this.buildId = typeof process !== 'undefined' ? process.env.BUILD_ID : 'unknown';
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    private async log(level: string, message: string) {
        if (!this.enabled) return;

        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const line = `[${timestamp}] [${this.buildId}] [${level}] ${message}\n`;

        try {
            await this.app.vault.adapter.append(this.LOG_FILE, line);
        } catch (e) {
            console.error('Failed to write to log file', e);
        }
    }

    async info(message: string) {
        await this.log('INFO', message);
    }

    async warn(message: string) {
        await this.log('WARN', message);
    }

    async error(message: string) {
        await this.log('ERROR', message);
    }
}
