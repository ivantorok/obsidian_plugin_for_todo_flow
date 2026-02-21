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

        if (typeof window !== 'undefined') {
            ((window as any)._logs = (window as any)._logs || []).push(`[NavigationManager] BORN. History size: ${this.state.history.length}`);
        }

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

            const isExternal = await this.persistenceService.isExternalUpdate(file.path, this.state.currentStack);
            if ((isOurSource || isItemInStack) && isExternal) {
                if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[NavigationManager] External update detected for ${file.path}. Triggering refresh...`);
                await this.refresh();
            } else if (isOurSource || isItemInStack) {
                if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[NavigationManager] Update detected for ${file.path} but REJECTED (Internal/Recent). isExternal=${isExternal}`);
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
        // Immediate push of current state to ensure deterministic initialization
        listener(this.getState());
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

        console.log(`[NavigationManager] Refreshing stack. Source: ${this.state.currentSource}, Current tasks: ${this.state.currentStack.length}`);
        if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[NavigationManager] Refreshing stack. Source: ${this.state.currentSource}, Current tasks: ${this.state.currentStack.length}`);
        let rawTasks: TaskNode[] = [];
        try {
            if (this.state.currentSource.startsWith('EXPLICIT')) {
                const ids = this.state.currentStack.map(t => t.id);
                if (ids.length === 0) {
                    console.warn(`[NavigationManager] Refresh aborted: EXPLICIT source but currentStack is EMPTY!`);
                    return;
                }
                rawTasks = await this.loader.loadSpecificFiles(ids);
            } else if (this.state.currentSource === 'QUERY:SHORTLIST') {
                rawTasks = await this.loader.loadShortlisted();
            } else {
                rawTasks = await this.loader.load(this.state.currentSource);
            }

            const processed = this.preprocessor ? this.preprocessor(rawTasks) : rawTasks;

            if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[NavigationManager] Refresh success. Tasks: ${this.state.currentStack.length} -> ${processed.length}`);

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
        const msg = `[NavigationManager] setStack() with ${tasks.length} tasks from ${source}`;
        console.log(msg);
        if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(msg);
        if (typeof window !== 'undefined') {
            const existing = localStorage.getItem('_todo_flow_debug_logs') || '';
            localStorage.setItem('_todo_flow_debug_logs', existing + '\n' + msg);
        }
        this.state.currentStack = [...tasks];
        this.state.currentSource = source;
        this.state.currentFocusedIndex = 0;
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

        // Log BEFORE pushing to history (to accurately report "before" state)
        const depthBefore = this.state.history.length;
        if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[NavigationManager] drillDown into ${task.id}, stack depth before: ${depthBefore}`);

        // Push current state to history
        console.log(`[NavigationManager] push history. Current stack size: ${this.state.currentStack.length}, History depth before: ${depthBefore}`);
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
        const stackLen = this.state.currentStack.length;
        const clamped = stackLen > 0 ? Math.max(0, Math.min(stackLen - 1, index)) : 0;

        if (this.state.currentFocusedIndex === clamped) return;
        this.state.currentFocusedIndex = clamped;
        this.notifyListeners();
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
        const previousStack = this.state.history.pop();
        const previousSource = this.state.sourceHistory.pop();
        const previousFocusIndex = this.state.focusedHistory.pop() ?? 0;

        if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[NavigationManager] goBack() popped. previousStack exists: ${!!previousStack}, count: ${previousStack?.length}, depth now: ${this.state.history.length}`);

        if (!previousStack || previousSource === undefined) {
            if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[NavigationManager] goBack() FAILED - history empty or corrupt`);
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
        if (typeof window !== 'undefined') {
            ((window as any)._logs = (window as any)._logs || []).push(`[NavigationManager] setState called. Incoming history size: ${state.history?.length}`);
        }
        this.state = state;
        this.notifyListeners();
    }
}
