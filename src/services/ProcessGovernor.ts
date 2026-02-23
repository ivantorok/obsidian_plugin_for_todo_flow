import { type App } from 'obsidian';

export enum PressureLevel {
    NORMAL = 'NORMAL',
    YELLOW = 'YELLOW', // High pressure, throttle background tasks
    RED = 'RED'      // Critical pressure, halt non-essential tasks
}

export class ProcessGovernor {
    private static instance: ProcessGovernor;
    private logger: any;
    private interactionCount: number = 0;
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
     * Track UI interactions (dragging, swiping) to prioritize responsiveness.
     */
    public claimInteraction() {
        this.interactionCount++;
        if (this.logger && this.interactionCount === 1) {
            this.logger.info('[ProcessGovernor] UI Interaction START (High Pressure enabled)');
        }
    }

    private lastInteractionEndTime: number = 0;

    public releaseInteraction() {
        this.interactionCount = Math.max(0, this.interactionCount - 1);
        if (this.interactionCount === 0) {
            this.lastInteractionEndTime = Date.now();
            if (this.logger) {
                this.logger.info('[ProcessGovernor] UI Interaction END (Cooldown period started)');
            }
        }
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

    /**
     * Returns a multiplier for debounce timers or scan depths.
     * NORMAL: 1.0x, YELLOW: 2.0x, RED: 5.0x
     */
    public getThrottleMultiplier(): number {
        const level = this.getPressureLevel();
        switch (level) {
            case PressureLevel.YELLOW: return 2.0;
            case PressureLevel.RED: return 5.0;
            default: return 1.0;
        }
    }

    public isHighPressure(): boolean {
        // High pressure if:
        // 1. Any active interaction is in progress
        // 2. We are within the 1000ms cooldown period after the last interaction
        const inCooldown = this.interactionCount === 0 && (Date.now() - this.lastInteractionEndTime < 500);

        if (this.interactionCount > 0 || inCooldown) return true;

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
        const multiplier = this.getThrottleMultiplier();

        this.logger.info(`[ProcessGovernor] Heap: ${usedMB}MB / ${limitMB}MB (${level}, Mutliplier: ${multiplier}x)`);
    }
}
