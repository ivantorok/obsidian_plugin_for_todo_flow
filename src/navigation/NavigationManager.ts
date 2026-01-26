import { type TaskNode } from '../scheduler.js';
import { type StackLoader } from '../loaders/StackLoader.js';

/**
 * NavigationState - Represents the current navigation state
 */
export interface NavigationState {
    currentStack: TaskNode[];
    currentFocusedIndex: number;
    history: TaskNode[][];
    focusedHistory: number[]; // Track focus index for each level
    sourceHistory: string[]; // Track sources for each history entry
    currentSource: string;
}

/**
 * NavigationManager - Pure state management for stack navigation
 * 
 * Manages drill-down and go-back navigation through task hierarchies.
 */
export class NavigationManager {
    private state: NavigationState;
    private loader: StackLoader;
    private preprocessor?: ((tasks: TaskNode[]) => TaskNode[]) | undefined;

    constructor(loader: StackLoader, preprocessor?: ((tasks: TaskNode[]) => TaskNode[]) | undefined) {
        this.loader = loader;
        this.preprocessor = preprocessor;
        this.state = {
            currentStack: [],
            currentFocusedIndex: 0,
            history: [],
            focusedHistory: [],
            sourceHistory: [],
            currentSource: ''
        };
    }

    /**
     * Set the current stack from a source
     */
    setStack(tasks: TaskNode[], source: string): void {
        this.state.currentStack = [...tasks];
        this.state.currentSource = source;
    }

    /**
     * Get the current visible stack
     */
    getCurrentStack(): TaskNode[] {
        return [...this.state.currentStack];
    }

    /**
     * Clear all navigation state
     */
    clear(): void {
        this.state = {
            currentStack: [],
            currentFocusedIndex: 0,
            history: [],
            focusedHistory: [],
            sourceHistory: [],
            currentSource: ''
        };
    }

    /**
     * Drill down into a task's children
     */
    async drillDown(taskId: string, currentFocusIndex: number): Promise<boolean> {
        // Find the task in current stack
        const task = this.state.currentStack.find(t => t.id === taskId);
        if (!task) {
            return false;
        }

        // Use StackLoader to load children (handles both files and folders)
        const children = await this.loader.load(task.id);

        if (children.length === 0) {
            return false;
        }

        // Push current state to history
        console.log(`[NavigationManager] push history. Current stack size: ${this.state.currentStack.length}, History index before: ${this.state.history.length}`);
        this.state.history.push([...this.state.currentStack]);
        this.state.focusedHistory.push(currentFocusIndex);
        this.state.sourceHistory.push(this.state.currentSource);
        console.log(`[NavigationManager] history pushed. Now depth: ${this.state.history.length}`);

        // Set children as current stack
        this.state.currentStack = this.preprocessor ? this.preprocessor(children) : children;
        this.state.currentSource = task.id;
        this.state.currentFocusedIndex = 0; // New stack starts at top

        return true;
    }

    /**
     * Go back to previous stack
     * Returns the focus index to restore
     */
    async goBack(): Promise<{ success: boolean; focusedIndex: number }> {
        console.log(`[NavigationManager] goBack() entry. History length: ${this.state.history.length}`);
        if (this.state.history.length === 0) {
            console.log('[NavigationManager] goBack() failed: history empty');
            return { success: false, focusedIndex: 0 };
        }

        // Pop history entries
        const previousStack = this.state.history.pop();
        const previousSource = this.state.sourceHistory.pop();
        const previousFocus = this.state.focusedHistory.pop() ?? 0;

        console.log(`[NavigationManager] popping from history. prevSource: ${previousSource}, prevFocus: ${previousFocus}`);

        if (previousSource === undefined) {
            console.log('[NavigationManager] goBack() failed: previousSource undefined');
            return { success: false, focusedIndex: 0 };
        }

        // Re-parse the source via StackLoader to ensure fresh metadata
        console.log(`[NavigationManager] loading source: ${previousSource}`);

        let refreshedStack: TaskNode[];

        if (previousSource.startsWith('EXPLICIT')) {
            // "EXPLICIT" mode means we have a specific list of files (the Tray).
            // We can't load "EXPLICIT:N" from disk. We must reload the IDs we had.
            if (previousStack && previousStack.length > 0) {
                const ids = previousStack.map(t => t.id);
                console.log(`[NavigationManager] Reloading Explicit Tray. IDs: ${ids.length} items (${ids.slice(0, 3).join(', ')}...)`);
                refreshedStack = await this.loader.loadSpecificFiles(ids);
                console.log(`[NavigationManager] Reload result: ${refreshedStack.length} items.`);

                // FAIL-SAFE: If reload failed to find files (e.g. temporary vault issue or odd paths),
                // fallback to previousStack to avoid empty screen.
                if (refreshedStack.length === 0) {
                    console.warn(`[NavigationManager] WARN: Reload returned 0 items. Falling back to cached history stack.`);
                    refreshedStack = [...previousStack];
                }
            } else {
                console.warn(`[NavigationManager] Previous stack history was empty.`);
                refreshedStack = [];
            }
        } else {
            refreshedStack = await this.loader.load(previousSource);
        }

        console.log(`[NavigationManager] load complete. Tasks found: ${refreshedStack.length}`);

        this.state.currentStack = this.preprocessor ? this.preprocessor(refreshedStack) : refreshedStack;
        this.state.currentSource = previousSource;
        this.state.currentFocusedIndex = previousFocus;

        return { success: true, focusedIndex: previousFocus };
    }

    /**
     * Check if we can go back
     */
    canGoBack(): boolean {
        return this.state.history.length > 0;
    }

    /**
     * Get current navigation state
     */
    getState(): NavigationState {
        return { ...this.state };
    }

    /**
     * Set navigation state (for restoration)
     */
    setState(state: NavigationState): void {
        this.state = state;
    }
}
