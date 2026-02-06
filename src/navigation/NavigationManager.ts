import { App, TFile, type EventRef } from 'obsidian';
import { type TaskNode } from '../scheduler.js';
import { type StackLoader } from '../loaders/StackLoader.js';
import { type StackPersistenceService } from '../services/StackPersistenceService.js';

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
    forceRefresh?: boolean; // BUG-009: Used to bypass memory cache during reload
}

/**
 * NavigationManager - Pure state management for stack navigation
 * 
 * Manages drill-down and go-back navigation through task hierarchies.
 */
export class NavigationManager {
    private state: NavigationState;
    private loader: StackLoader;
    private app: App;
    private persistenceService: StackPersistenceService;
    private preprocessor?: ((tasks: TaskNode[]) => TaskNode[]) | undefined;
    private listeners: ((state: NavigationState) => void)[] = [];
    private eventRef: EventRef | null = null;

    constructor(
        app: App,
        loader: StackLoader,
        persistenceService: StackPersistenceService,
        preprocessor?: ((tasks: TaskNode[]) => TaskNode[]) | undefined
    ) {
        this.app = app;
        this.loader = loader;
        this.persistenceService = persistenceService;
        this.preprocessor = preprocessor;
        this.state = {
            currentStack: [],
            currentFocusedIndex: 0,
            history: [],
            focusedHistory: [],
            sourceHistory: [],
            currentSource: ''
        };

        this.registerWatcher();
    }

    private registerWatcher(): void {
        if (!this.app || !this.app.metadataCache) {
            console.error(`[NavigationManager] FATAL: app or metadataCache is undefined!`, this.app);
        }
        this.eventRef = this.app.metadataCache.on('changed', async (file) => {
            if (!(file instanceof TFile)) return;

            // Check if this file is relevant to our current stack
            const isOurSource = file.path === this.state.currentSource;
            const isItemInStack = this.state.currentStack.some(t => t.id === file.path);

            if ((isOurSource || isItemInStack) && this.persistenceService.isExternalUpdate(file.path)) {
                console.log(`[NavigationManager] External update detected for ${file.path}. Triggering refresh...`);
                await this.refresh();
            }
        });
    }

    public destroy(): void {
        if (this.eventRef) {
            this.app.metadataCache.offref(this.eventRef);
            this.eventRef = null;
        }
    }

    /**
     * Subscribe to state changes
     */
    onStackChange(listener: (state: NavigationState) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners(): void {
        const stateCopy = this.getState();
        this.listeners.forEach(l => l(stateCopy));
    }

    /**
     * Refresh the current stack from disk
     */
    async refresh(): Promise<void> {
        if (!this.state.currentSource) return;

        let rawTasks: TaskNode[] = [];
        try {
            if (this.state.currentSource.startsWith('EXPLICIT')) {
                const ids = this.state.currentStack.map(t => t.id);
                rawTasks = await this.loader.loadSpecificFiles(ids);
            } else if (this.state.currentSource === 'QUERY:SHORTLIST') {
                rawTasks = await this.loader.loadShortlisted();
            } else {
                rawTasks = await this.loader.load(this.state.currentSource);
            }

            const processed = this.preprocessor ? this.preprocessor(rawTasks) : rawTasks;

            // Preserve focus if possible
            const focusedId = this.state.currentStack[this.state.currentFocusedIndex]?.id;

            this.state.currentStack = processed;

            if (focusedId) {
                const newIndex = this.state.currentStack.findIndex(t => t.id === focusedId);
                if (newIndex !== -1) {
                    this.state.currentFocusedIndex = newIndex;
                }
            }

            this.notifyListeners();
        } catch (e) {
            console.error(`[NavigationManager] Refresh failed:`, e);
        }
    }

    /**
     * Set the current stack from a source
     */
    setStack(tasks: TaskNode[], source: string): void {
        this.state.currentStack = [...tasks];
        this.state.currentSource = source;
        this.notifyListeners();
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
        this.notifyListeners();
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

        // ATOMIC FILE MODE: Allow drilling into empty files (creating a new stack)
        // if (children.length === 0) {
        //     return false;
        // }

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

        this.notifyListeners();
        return true;
    }

    /**
     * Go back to previous stack
     * Returns the focus index to restore
     */
    /**
     * Update the current focused index (from UI)
     */
    setFocus(index: number): void {
        this.state.currentFocusedIndex = index;
        // We don't necessarily need to notify listeners here if it's coming FROM the UI,
        // but it's good for consistency if other listeners exist.
        // For now, let's just update the internal state to avoid feedback loops.
    }

    /**
     * Go back to previous stack
     * Returns the focus index to restore
     */
    async goBack(): Promise<{ success: boolean; focusedIndex: number }> {
        if (this.state.history.length === 0) {
            return { success: false, focusedIndex: 0 };
        }

        // Pop history entries
        const previousStack = this.state.history.pop(); // SNAPSHOT: Contains exactly what we had (including archive state)
        const previousSource = this.state.sourceHistory.pop();
        const previousFocusIndex = this.state.focusedHistory.pop() ?? 0;

        if (!previousStack || previousSource === undefined) {
            return { success: false, focusedIndex: 0 };
        }

        // --- INTELLIGENT FOCUS RESTORATION CORRECTION ---
        // We know the index we were at: previousFocusIndex.
        // We want to know exactly WHICH task ID was at that index in the snapshot *before* we potentially re-process or re-load.
        const previousFocusedTaskId = previousStack[previousFocusIndex]?.id;

        // --- SNAPSHOT RESTORATION POLICY ---
        // Instead of reloading blindly from Disk (which resurrects archived tasks), 
        // we take the SNAPSHOT as the Source of Truth for *Existence*.
        // However, we still want fresh metadata (Title, Status updates) if possible.
        // Strategy:
        // 1. Load fresh data from disk for the source.
        // 2. Filter fresh data to ONLY include IDs that are in our Snapshot.
        //    (This respects "Archived" state - if it wasn't in snapshot, it stays gone).
        // 3. Update the Snapshot items with fresh data where available.
        // 4. If an item is in Snapshot but gone from Disk (deleted externally), we keep it as a ghost 
        //    OR mark it? For now, we keep the Snapshot version to avoid UI jumping.

        // Step 1: Load Fresh (if possible) to get updates
        let freshData: TaskNode[] = [];
        try {
            if (previousSource.startsWith('EXPLICIT')) {
                const ids = previousStack.map(t => t.id);
                freshData = await this.loader.loadSpecificFiles(ids);
            } else {
                freshData = await this.loader.load(previousSource);
            }
        } catch (e) {
            console.warn(`[NavigationManager] Failed to load fresh data for ${previousSource}. Using snapshot only.`, e);
        }

        // Step 2 & 3: Merge Fresh Data into Snapshot
        // We iterate over the SNAPSHOT (to preserve order and existence).
        // If we find a fresh version, we swap it in.
        const mergedStack = previousStack.map(snapshotTask => {
            const freshTask = freshData.find(f => f.id === snapshotTask.id);
            if (freshTask) {
                // Return fresh task but preserve ephemeral state if needed? 
                // For now, fresh task is best as it has latest title/status.
                // UNLESS anchored status changed? 
                // We assume fresh disk state is better for everything except "Existence in List".
                return freshTask;
            }
            return snapshotTask; // Keep snapshot version if not found on disk
        });

        // Step 4: Apply Preprocessor (Schedule/Sort)
        // This might reorder the stack based on new times!
        const finalStack = this.preprocessor ? this.preprocessor(mergedStack) : mergedStack;

        // --- RE-CALCULATE FOCUS INDEX ---
        // Now that we have the final, potentially reordered stack, find where our Target ID went.
        let newFocusedIndex = previousFocusIndex;

        if (previousFocusedTaskId) {
            const foundIndex = finalStack.findIndex(t => t.id === previousFocusedTaskId);
            if (foundIndex !== -1) {
                newFocusedIndex = foundIndex;
            } else {
                console.warn(`[NavigationManager] Focus target ID ${previousFocusedTaskId} not found in restored stack. Fallback to index ${previousFocusIndex}.`);
                // Clamp to bounds
                newFocusedIndex = Math.min(newFocusedIndex, Math.max(0, finalStack.length - 1));
            }
        }

        this.state.currentStack = finalStack;
        this.state.currentSource = previousSource;
        this.state.currentFocusedIndex = newFocusedIndex;

        this.notifyListeners();
        return { success: true, focusedIndex: newFocusedIndex };
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
        this.notifyListeners();
    }
}
