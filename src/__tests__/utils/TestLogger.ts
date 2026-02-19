import fs from 'fs';
import path from 'path';

export class TestLogger {
    private logFile: string;

    constructor() {
        this.logFile = path.resolve(process.cwd(), 'test_run.log');
        // Clear previous logs on instantiation? Or append? 
        // Let's append, but maybe add a separator.
        fs.appendFileSync(this.logFile, `\n\n--- Test Run Start: ${new Date().toISOString()} ---\n`);
    }

    async info(message: string) {
        this.log('INFO', message);
    }

    async warn(message: string) {
        this.log('WARN', message);
    }

    async error(message: string) {
        this.log('ERROR', message);
    }

    private log(level: string, message: string) {
        const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
        fs.appendFileSync(this.logFile, line);
    }
}
