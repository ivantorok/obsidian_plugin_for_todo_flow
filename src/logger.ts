import { type App } from 'obsidian';
import moment from 'moment';

declare const process: { env: { BUILD_ID: string } };

export class FileLogger {
    public LOG_FILE: string;
    private enabled: boolean;
    private app: App;
    private buildId: string;
    private logBuffer: string[] = [];
    private readonly MAX_BUFFER_SIZE = 100;

    constructor(app: App, enabled: boolean, logPath: string = 'todo-flow.log') {
        this.app = app;
        this.enabled = enabled;
        this.LOG_FILE = logPath;
        this.buildId = typeof process !== 'undefined' ? (process.env as any).BUILD_ID : 'unknown';
    }

    private async ensureLogDir() {
        const parts = this.LOG_FILE.split('/');
        if (parts.length > 1) {
            const dir = parts.slice(0, -1).join('/');
            if (!(await this.app.vault.adapter.exists(dir))) {
                await this.app.vault.adapter.mkdir(dir);
            }
        }
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    private async log(level: string, message: string) {
        if (!this.enabled) return;

        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const line = `[${timestamp}] [${this.buildId}] [${level}] ${message}\n`;

        // Support for absolute paths (Project Folder) via Node.js fs when available
        if (this.LOG_FILE.startsWith('/') && typeof require !== 'undefined') {
            try {
                const fs = require('fs');
                fs.appendFileSync(this.LOG_FILE, line);
                return;
            } catch (e) {
                // Fallback to vault log if fs fails
                console.error('[FileLogger] Failed to write to absolute path via fs:', e);
            }
        }

        try {
            this.logBuffer.push(line);
            if (this.logBuffer.length > this.MAX_BUFFER_SIZE) {
                this.logBuffer.shift();
            }
            await this.ensureLogDir();
            await this.app.vault.adapter.append(this.LOG_FILE, line);
        } catch (e) {
            console.error('[FileLogger] Failed to write to vault log file:', e);
        }
    }

    getBuffer(): string[] {
        return this.logBuffer;
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
