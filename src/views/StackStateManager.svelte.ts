import { untrack } from "svelte";
import type { StateManagerConfig } from "./GestureTypes.js";

export class StackStateManager {
    private lastProcessedNavState: any = null;

    constructor(private config: StateManagerConfig) { }

    /**
     * Handles index out of bounds and safe index clamping
     */
    syncFocusIndex() {
        const navState = this.config.getNavState();
        if (navState.tasks.length > 0) {
            const clamped = Math.max(
                0,
                Math.min(navState.tasks.length - 1, navState.focusedIndex),
            );
            if (clamped !== navState.focusedIndex) {
                if (this.config.logger)
                    this.config.logger.warn(
                        `[StackStateManager] Index Out of Bounds Fix: ${navState.focusedIndex} -> ${clamped} (Tasks: ${navState.tasks.length})`,
                    );
                untrack(() => {
                    navState.focusedIndex = clamped;
                    if (this.config.onFocusChange) this.config.onFocusChange(clamped);
                });
            }
        } else if (navState.focusedIndex !== 0) {
            untrack(() => {
                navState.focusedIndex = 0;
                if (this.config.onFocusChange) this.config.onFocusChange(0);
            });
        }
    }

    /**
     * Syncs navigation state changes
     */
    syncNavState() {
        const currentNavState = this.config.getNavState();
        if (
            !currentNavState ||
            currentNavState === untrack(() => this.lastProcessedNavState)
        )
            return;

        untrack(() => {
            if (this.config.getEditingIndex() !== -1 || this.config.getEditingStartTimeIndex() !== -1) return;
            this.lastProcessedNavState = currentNavState;
        });
    }

    /**
     * Syncs time-based updates from the controller
     */
    syncControllerTime() {
        const internalNow = this.config.getInternalNow();
        const controller = this.config.getController();
        const navState = this.config.getNavState();

        if (internalNow && controller) {
            untrack(() => {
                controller.updateTime(internalNow);
                const ctrTasks = controller.getTasks();
                // Only sync back if controller has tasks or if the stack is intended to be empty
                if (ctrTasks.length > 0 || navState.tasks.length === 0) {
                    navState.tasks = [...ctrTasks];
                }
            });
        }
    }

    /**
     * Forces a re-render by incrementing the tick
     */
    triggerUpdate() {
        this.config.setRerenderTick(this.config.getRerenderTick() + 1);
        const navState = this.config.getNavState();
        const controller = this.config.getController();
        if (controller) {
            const tasks = controller.getTasks();
            navState.tasks = [...tasks];
        }
        if (this.config.onStackChange) {
            this.config.onStackChange(navState.tasks, navState.focusedIndex);
        }
    }
}
