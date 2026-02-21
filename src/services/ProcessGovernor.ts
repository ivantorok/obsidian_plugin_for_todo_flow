import { type App } from 'obsidian';

export enum PressureLevel {
    NORMAL = 'NORMAL',
    YELLOW = 'YELLOW', // High pressure, throttle background tasks
    RED = 'RED'      // Critical pressure, halt non-essential tasks
}

export class ProcessGovernor {
    private static instance: ProcessGovernor;
    private logger: any;
    private yellowThreshold: number = 0.7; // 70% of heap
    private redThreshold: number = 0.9;    // 90% of heap

    private constructor(private app: App, logger?: any) {
        this.logger = logger;
    }

    public static getInstance(app: App, logger?: any): ProcessGovernor {
        if (!ProcessGovernor.instance) {
            ProcessGovernor.instance = new ProcessGovernor(app, logger);
        }
        return ProcessGovernor.instance;
    }

    /**
     * Estimates current memory pressure level.
     * Uses performance.memory in browser/renderer context.
     */
    public getPressureLevel(): PressureLevel {
        const memory = (performance as any).memory;
        if (!memory) return PressureLevel.NORMAL;

        const used = memory.usedJSHeapSize;
        const limit = memory.jsHeapSizeLimit;
        const ratio = used / limit;

        if (ratio >= this.redThreshold) {
            return PressureLevel.RED;
        } else if (ratio >= this.yellowThreshold) {
            return PressureLevel.YELLOW;
        }

        return PressureLevel.NORMAL;
    }

    public isHighPressure(): boolean {
        const level = this.getPressureLevel();
        return level === PressureLevel.YELLOW || level === PressureLevel.RED;
    }

    public isCriticalPressure(): boolean {
        return this.getPressureLevel() === PressureLevel.RED;
    }

    public logStatus() {
        if (!this.logger) return;
        const memory = (performance as any).memory;
        if (!memory) {
            this.logger.info('[ProcessGovernor] Memory monitoring not available.');
            return;
        }

        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
        const level = this.getPressureLevel();

        this.logger.info(`[ProcessGovernor] Heap: ${usedMB}MB / ${limitMB}MB (${level})`);
    }
}
