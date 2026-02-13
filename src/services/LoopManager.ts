export interface LoopResult {
    nextIndex: number;
    showVictory: boolean;
}

export class LoopManager {
    /**
     * Resolves the next index based on current position and loop settings.
     * @param currentIndex Current index in the task list
     * @param totalItems Total number of items in the stack
     * @param loopEnabled Whether the perpetual loop is enabled
     * @returns LoopResult containing the next index and whether to show the victory card
     */
    static resolveNextIndex(currentIndex: number, totalItems: number, loopEnabled: boolean = true): LoopResult {
        if (totalItems === 0) {
            return { nextIndex: 0, showVictory: false };
        }

        if (currentIndex < totalItems - 1) {
            return { nextIndex: currentIndex + 1, showVictory: false };
        }

        // We are at the final task
        if (loopEnabled) {
            return { nextIndex: currentIndex, showVictory: true };
        }

        // If loop is disabled, we just stay at the last index (current behavior)
        return { nextIndex: currentIndex, showVictory: false };
    }

    /**
     * Resets the loop to the beginning.
     * @returns nextIndex: 0
     */
    static restartLoop(): number {
        return 0;
    }
}
