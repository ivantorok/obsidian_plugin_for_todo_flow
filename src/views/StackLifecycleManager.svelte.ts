import type { TodoFlowSettings } from "../settings.js";

export interface LifecycleConfig {
    onTick: () => void;
    onResize: () => void;
    onMount: () => void;
    onUnmount: () => void;
    logger: any;
}

export class StackLifecycleManager {
    private interval: any = null;

    constructor(private config: LifecycleConfig) { }

    mount() {
        if (this.config.logger)
            this.config.logger.info("[StackLifecycleManager] Mounting...");

        // Setup periodic refresh
        this.interval = setInterval(() => {
            this.config.onTick();
        }, 60000);

        window.addEventListener("resize", this.config.onResize);

        this.config.onMount();
    }

    unmount() {
        if (this.config.logger)
            this.config.logger.info("[StackLifecycleManager] Unmounting...");

        if (this.interval) clearInterval(this.interval);
        window.removeEventListener("resize", this.config.onResize);

        this.config.onUnmount();
    }
}
