import { type App, TFile } from 'obsidian';
import { ProcessGovernor } from './ProcessGovernor.js';
import { FileLogger } from '../logger.js';

export interface SaveRequest {
    filePath: string;
    content?: string;
    saveFn: () => Promise<void>;
}

/**
 * Interaction-Idle Queue
 * Buffers disk I/O requests (save task, save stack) during High Pressure 
 * (UI interaction or memory stress) and flushes them when the system is idle.
 */
export class InteractionIdleQueue {
    private static instance: InteractionIdleQueue;
    private buffer: Map<string, SaveRequest> = new Map();
    private governor: ProcessGovernor;
    private logger: FileLogger | undefined;
    private flushTimer: any = null;
    private isFlushing: boolean = false;
    private isExecutingSave: boolean = false;

    private constructor(private app: App, logger?: FileLogger) {
        this.governor = ProcessGovernor.getInstance(app, logger);
        this.logger = logger;
    }

    public static getInstance(app: App, logger?: FileLogger): InteractionIdleQueue {
        if (!InteractionIdleQueue.instance) {
            InteractionIdleQueue.instance = new InteractionIdleQueue(app, logger);
        }
        return InteractionIdleQueue.instance;
    }

    public getIsIdle(): boolean {
        return this.buffer.size === 0 && !this.isFlushing;
    }

    /**
     * Pushes a save request into the queue.
     * If pressure is low, it executes immediately (after a small debounce).
     * If pressure is high, it waits for the next idle interval.
     */
    public async push(request: SaveRequest, immediate: boolean = false): Promise<void> {
        // De-duplicate: The latest request for a file always wins
        this.buffer.set(request.filePath, request);

        if (this.logger) {
            this.logger.info(`[InteractionIdleQueue] Pushing request for ${request.filePath} (Immediate: ${immediate})`);
        }

        if (immediate) {
            return this.flush();
        }

        this.scheduleFlush();
    }

    private scheduleFlush() {
        if (this.flushTimer) clearTimeout(this.flushTimer);

        // Adaptive debounce based on pressure
        const delay = this.governor.isHighPressure() ? 1000 : 250;

        this.flushTimer = setTimeout(() => {
            if (!this.governor.isHighPressure()) {
                this.flush();
            } else {
                // Still under pressure? Re-schedule
                this.scheduleFlush();
            }
        }, delay);
    }

    private pendingFlush: Promise<void> = Promise.resolve();

    public async flush(): Promise<void> {
        if (typeof window !== 'undefined') {
            (window as any)._tf_log = (window as any)._tf_log || [];
            (window as any)._tf_log.push(`[InteractionIdleQueue] flush() entry. buffer=${this.buffer.size}, isFlushing=${this.isFlushing}, isExecutingSave=${this.isExecutingSave}`);
        }

        // Chain flushes: Ensure each flush waits for the previous one to complete
        // but only if we have something to flush or are already flushing.
        if (this.buffer.size === 0 && !this.isFlushing) return;

        // Use a local copy of the chain to avoid race conditions
        const driveFlush = async () => {
            if (this.isFlushing) {
                 if (typeof window !== 'undefined') (window as any)._tf_log.push(`[InteractionIdleQueue] driveFlush() EXIT: already flushing (draining buffer)`);
                 return;
            }
            
            this.isFlushing = true;
            try {
                while (this.buffer.size > 0) {
                    const snapshot = Array.from(this.buffer.values());
                    this.buffer.clear();

                    if (typeof window !== 'undefined') (window as any)._tf_log.push(`[InteractionIdleQueue] driveFlush() loop START. snapshot=${snapshot.length}`);

                    for (const request of snapshot) {
                        try {
                            this.isExecutingSave = true;
                            if (typeof window !== 'undefined') (window as any)._tf_log.push(`[InteractionIdleQueue] Executing saveFn for ${request.filePath}`);
                            await request.saveFn();
                        } catch (err) {
                            console.error(`[InteractionIdleQueue] Flush failed for ${request.filePath}:`, err);
                            if (typeof window !== 'undefined') (window as any)._tf_log.push(`[InteractionIdleQueue] SaveFn FAILED for ${request.filePath}: ${err}`);
                        } finally {
                            this.isExecutingSave = false;
                        }
                    }
                    if (typeof window !== 'undefined') (window as any)._tf_log.push(`[InteractionIdleQueue] driveFlush() loop END. buffer remaining=${this.buffer.size}`);
                }
            } finally {
                this.isFlushing = false;
                if (typeof window !== 'undefined') (window as any)._tf_log.push(`[InteractionIdleQueue] driveFlush() COMPLETE`);
            }
        };

        this.pendingFlush = this.pendingFlush.then(driveFlush);
        return this.pendingFlush;
    }

    /**
     * Resets the singleton instance. Used for unit testing.
     */
    public static resetInstance() {
        (InteractionIdleQueue as any).instance = undefined;
    }

    /**
     * Forces an immediate flush of all pending items.
     * Used for plugin unload, App blur, or critical view changes.
     */
    public async forceFlush(): Promise<void> {
        if (this.flushTimer) clearTimeout(this.flushTimer);
        await this.flush();
    }
}
