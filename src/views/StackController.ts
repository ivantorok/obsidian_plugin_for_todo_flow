import moment from 'moment';
import { computeSchedule, getMinDuration, type TaskNode } from '../scheduler.js';

const DURATION_SEQUENCE = [2, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480];

export class StackController {
    private tasks: TaskNode[];
    private currentTime: moment.Moment;
    private onTaskUpdate: ((task: TaskNode) => void) | undefined;
    private onTaskCreate: ((title: string) => TaskNode) | undefined;
    private isFrozen: boolean = false;
    private pendingActions: Map<string, Array<() => void>> = new Map();

    constructor(
        initialTasks: TaskNode[],
        currentTime: moment.Moment,
        onTaskUpdate?: (task: TaskNode) => void,
        onTaskCreate?: (title: string) => TaskNode
    ) {
        this.currentTime = currentTime;
        this.onTaskUpdate = onTaskUpdate;
        this.onTaskCreate = onTaskCreate;
        this.tasks = computeSchedule(initialTasks, currentTime);
    }

    updateTime(newTime: moment.Moment) {
        this.currentTime = newTime;
        if (!this.isFrozen) {
            this.tasks = computeSchedule(this.tasks, this.currentTime);
        }
    }

    freeze() {
        this.isFrozen = true;
    }

    unfreeze() {
        this.isFrozen = false;
        this.tasks = computeSchedule(this.tasks, this.currentTime);
    }

    get now(): moment.Moment {
        return this.currentTime;
    }

    getTasks(): TaskNode[] {
        return this.tasks;
    }

    setTasks(tasks: TaskNode[]) {
        if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[StackController] setTasks called with ${tasks.length} tasks`);
        // When setting tasks from external source (e.g. NavigationManager refresh),
        // we must PRESERVE our local temp nodes if they haven't been resolved yet,
        // otherwise they'll disappear from the UI during the sync.
        const tempNodes = this.tasks.filter(t => t.id.startsWith('temp-'));
        const resolvedTasks = [...tasks];

        for (const temp of tempNodes) {
            if (!resolvedTasks.find(t => t.id === temp.id)) {
                resolvedTasks.unshift(temp); // Keep temp nodes at the top/original position
            }
        }

        this.tasks = this.isFrozen ? resolvedTasks : computeSchedule(resolvedTasks, this.currentTime);
    }

    /**
     * Resolves a temporary ID to a real file path.
     * Updates the task in memory and flushes any pending actions.
     */
    resolveTempId(tempId: string, realId: string) {
        const index = this.tasks.findIndex(t => t.id === tempId);
        if (index === -1) return;

        console.log(`[StackController] Resolving temp ID ${tempId} -> ${realId}`);
        this.tasks[index]!.id = realId;

        const actions = this.pendingActions.get(tempId);
        if (actions) {
            console.log(`[StackController] Flushing ${actions.length} pending actions for ${realId}`);
            actions.forEach(action => action());
            this.pendingActions.delete(tempId);
        }

        // Trigger a final update for the real ID
        this.onTaskUpdate?.(this.tasks[index]!);
    }

    private queueAction(id: string, action: () => void) {
        if (!id.startsWith('temp-')) {
            action();
            return;
        }

        console.log(`[StackController] Queuing action for temp ID ${id}`);
        const actions = this.pendingActions.get(id) || [];
        actions.push(action);
        this.pendingActions.set(id, actions);
    }

    moveUp(index: number): number {
        if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[StackController] moveUp(${index}) called. Tasks: ${this.tasks.length}`);
        if (index <= 0) return index;
        const taskToMove = this.tasks[index];
        if (!taskToMove) return index;
        if (taskToMove.id.startsWith('temp-')) {
            if (typeof window !== 'undefined') console.warn(`[StackController] moveUp BLOCKED: ${taskToMove.id} is temporary`);
            return index;
        }
        if (taskToMove.isAnchored) return index; // Anchors shouldn't move via list reordering

        // Find previous unanchored task
        let target = index - 1;
        while (target >= 0 && this.tasks[target]?.isAnchored) {
            target--;
        }

        if (target < 0) return index; // No valid slot above

        const newTasks = [...this.tasks];
        // Swap selection with valid target
        [newTasks[index], newTasks[target]] = [newTasks[target]!, newTasks[index]!];
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime);

        // Return the new index of the moved task (it might have been re-sorted)
        return this.tasks.findIndex(t => t.id === taskToMove.id);
    }

    moveDown(index: number): number {
        if (index >= this.tasks.length - 1) return index;
        const taskToMove = this.tasks[index];
        if (!taskToMove) return index;
        if (taskToMove.id.startsWith('temp-')) {
            if (typeof window !== 'undefined') console.warn(`[StackController] moveDown BLOCKED: ${taskToMove.id} is temporary`);
            return index;
        }
        if (taskToMove.isAnchored) return index; // Anchors shouldn't move

        // Find next unanchored task
        let target = index + 1;
        while (target < this.tasks.length && this.tasks[target]?.isAnchored) {
            target++;
        }

        if (target >= this.tasks.length) return index; // No valid slot below

        const newTasks = [...this.tasks];
        // Swap selection with valid target
        [newTasks[index], newTasks[target]] = [newTasks[target]!, newTasks[index]!];
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime);

        // Return the new index of the moved task
        return this.tasks.findIndex(t => t.id === taskToMove.id);
    }

    toggleAnchor(index: number, startTime?: moment.Moment): number {
        if (!this.tasks[index] || this.tasks[index].isMissing) return index;
        const taskToMove = this.tasks[index]!;
        const id = taskToMove.id;

        // BUG-022 Safety: Block actions on temporary IDs until they resolve
        if (id.startsWith('temp-')) {
            if (typeof window !== 'undefined') console.warn(`[StackController] toggleAnchor BLOCKED: ${id} is temporary`);
            return index;
        }

        const task = { ...taskToMove };
        task.isAnchored = !task.isAnchored;
        if (task.isAnchored && startTime) {
            task.startTime = moment(startTime);
        } else if (task.isAnchored) {
            task.startTime = moment(task.startTime);
        }

        const newTasks = [...this.tasks];
        newTasks[index] = task;
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime);

        const newIndex = this.tasks.findIndex(t => t.id === id);
        if (newIndex !== -1) {
            this.queueAction(id, () => this.onTaskUpdate?.(this.tasks[newIndex]!));
            return newIndex;
        }
        return index;
    }

    toggleStatus(index: number): number {
        if (!this.tasks[index] || this.tasks[index].isMissing) return index;
        const taskToMove = this.tasks[index]!;
        const id = taskToMove.id;

        // BUG-022 Safety: Block actions on temporary IDs until they resolve
        if (id.startsWith('temp-')) {
            if (typeof window !== 'undefined') console.warn(`[StackController] toggleStatus BLOCKED: ${id} is temporary`);
            return index;
        }

        const task = { ...taskToMove };
        task.status = task.status === 'todo' ? 'done' : 'todo';

        const newTasks = [...this.tasks];
        newTasks[index] = task;
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime);

        const newIndex = this.tasks.findIndex(t => t.id === id);
        if (newIndex !== -1) {
            this.queueAction(id, () => this.onTaskUpdate?.(this.tasks[newIndex]!));
            return newIndex;
        }
        return index;
    }

    updateTaskTitle(index: number, newTitle: string): number {
        if (!this.tasks[index] || this.tasks[index].isMissing) return index;
        const taskToMove = this.tasks[index]!;
        const id = taskToMove.id;

        // BUG-022 Safety: Block actions on temporary IDs until they resolve
        if (id.startsWith('temp-')) {
            if (typeof window !== 'undefined') console.warn(`[StackController] updateTaskTitle BLOCKED: ${id} is temporary`);
            return index;
        }
        const oldTitle = taskToMove.title;
        const task = { ...taskToMove };
        task.title = newTitle;

        const newTasks = [...this.tasks];
        newTasks[index] = task;
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime);

        const newIndex = this.tasks.findIndex(t => t.id === id);
        console.log(`[StackController] updateTaskTitle index ${index} -> ${newIndex}. "${oldTitle}" -> "${newTitle}"`);

        if (newIndex !== -1) {
            this.queueAction(id, () => this.onTaskUpdate?.(this.tasks[newIndex]!));
            return newIndex;
        }
        return index;
    }

    updateTaskMetadata(index: number, updates: { startTime?: moment.Moment | undefined, duration?: number | undefined, isAnchored?: boolean | undefined }): number {
        if (!this.tasks[index] || this.tasks[index].isMissing) return index;
        const taskToMove = this.tasks[index]!;
        const id = taskToMove.id;
        if (id.startsWith('temp-')) {
            if (typeof window !== 'undefined') console.warn(`[StackController] updateTaskMetadata BLOCKED: ${id} is temporary`);
            return index;
        }
        const task = { ...taskToMove };

        if (updates.startTime !== undefined) task.startTime = updates.startTime;
        if (updates.duration !== undefined) {
            task.duration = updates.duration;
            task.originalDuration = updates.duration; // Assume scale reset
        }
        if (updates.isAnchored !== undefined) task.isAnchored = updates.isAnchored;

        const newTasks = [...this.tasks];
        newTasks[index] = task;
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime);

        const newIndex = this.tasks.findIndex(t => t.id === taskToMove.id);
        console.log(`[StackController] updateTaskMetadata index ${index} -> ${newIndex}. Updates: ${JSON.stringify(updates)}`);

        if (newIndex !== -1) {
            this.onTaskUpdate?.(this.tasks[newIndex]!);
            return newIndex;
        }
        return index;
    }

    updateTaskById(id: string, updates: Partial<TaskNode>): number {
        if (id.startsWith('temp-')) {
            if (typeof window !== 'undefined') console.warn(`[StackController] updateTaskById BLOCKED: ${id} is temporary`);
            return -1;
        }
        const index = this.tasks.findIndex(t => t.id === id);
        if (index === -1) return -1;

        const taskToMove = this.tasks[index]!;
        const task = { ...taskToMove };

        if (updates.title !== undefined) task.title = updates.title;
        if (updates.startTime !== undefined) task.startTime = updates.startTime;
        if (updates.duration !== undefined) {
            task.duration = updates.duration;
            task.originalDuration = updates.duration;
        }
        if (updates.isAnchored !== undefined) task.isAnchored = updates.isAnchored;

        const newTasks = [...this.tasks];
        newTasks[index] = task;
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime);

        const newIndex = this.tasks.findIndex(t => t.id === id);
        if (newIndex !== -1) {
            this.onTaskUpdate?.(this.tasks[newIndex]!);
            return newIndex;
        }
        return -1;
    }

    addTaskAt(index: number, title: string): { task: TaskNode, index: number } | null {
        if (!this.onTaskCreate) return null;

        const newTask = this.onTaskCreate(title);
        const newTasks = [...this.tasks];
        // Insert AFTER current index
        newTasks.splice(index + 1, 0, newTask);

        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime);

        // Find the index of the newly added task (in case schedule reordered it, though unlikely for new floating task)
        const newIndex = this.tasks.findIndex(t => t.id === newTask.id);

        return { task: newTask, index: newIndex };
    }

    removeTask(index: number) {
        if (!this.tasks[index]) return;
        const newTasks = [...this.tasks];
        newTasks.splice(index, 1);
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime);
    }

    insertTask(index: number, task: TaskNode) {
        const newTasks = [...this.tasks];
        newTasks.splice(index, 0, task);
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime);
    }

    insertAfter(index: number, task: TaskNode): number {
        const newTasks = [...this.tasks];
        // Insert AFTER current index
        newTasks.splice(index + 1, 0, task);

        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime);

        // Find the index of the newly added task
        return this.tasks.findIndex(t => t.id === task.id);
    }

    // Removing renameTask as per remapping, but keeping it for now if needed. 
    // Actually user said "c" is for adding, so rename might need another key if they want it.
    // I'll keep the method but remove the binding.

    scaleDuration(index: number, direction: 'up' | 'down'): number {
        const entryMsg = `[StackController DEBUG] scaleDuration entry index=${index} direction=${direction}`;
        console.log(entryMsg);
        if (typeof window !== 'undefined') {
            const existing = localStorage.getItem('_todo_flow_debug_logs') || '';
            localStorage.setItem('_todo_flow_debug_logs', existing + '\n' + entryMsg);
        }
        if (!this.tasks[index] || this.tasks[index].isMissing) {
            const missingMsg = `[StackController DEBUG] scaleDuration early return: task[${index}] existing=${!!this.tasks[index]} isMissing=${this.tasks[index]?.isMissing}`;
            console.log(missingMsg);
            if (typeof window !== 'undefined') {
                const existing = localStorage.getItem('_todo_flow_debug_logs') || '';
                localStorage.setItem('_todo_flow_debug_logs', existing + '\n' + missingMsg);
            }
            return index;
        }
        const taskToMove = this.tasks[index]!;
        const id = taskToMove.id;

        // BUG-022 Safety: Block actions on temporary IDs until they resolve
        if (id.startsWith('temp-')) {
            if (typeof window !== 'undefined') console.warn(`[StackController] scaleDuration BLOCKED: ${id} is temporary`);
            return index;
        }
        const task = { ...taskToMove };
        const currentOwn = task.originalDuration ?? task.duration;

        let seqIndex = DURATION_SEQUENCE.findIndex(d => d >= currentOwn);
        if (seqIndex === -1) seqIndex = DURATION_SEQUENCE.length - 1;

        if (direction === 'up') {
            if (DURATION_SEQUENCE[seqIndex] === currentOwn) {
                seqIndex = Math.min(DURATION_SEQUENCE.length - 1, seqIndex + 1);
            }
            task.originalDuration = DURATION_SEQUENCE[seqIndex]!;
        } else {
            seqIndex = Math.max(0, seqIndex - 1);
            task.originalDuration = DURATION_SEQUENCE[seqIndex]!;
        }

        const newTasks = [...this.tasks];
        newTasks[index] = task;
        const logMsg1 = `[StackController DEBUG] Scaling task ${index} ${direction}. New duration: ${task.originalDuration}`;
        if (typeof window !== 'undefined') {
            ((window as any)._logs = (window as any)._logs || []).push(logMsg1);
            const existing = localStorage.getItem('_todo_flow_debug_logs') || '';
            localStorage.setItem('_todo_flow_debug_logs', existing + '\n' + logMsg1);
        }
        console.log(logMsg1);
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime);
        const logMsg2 = `[StackController DEBUG] Post-schedule tasks: ${this.tasks.map(t => t.title).join(', ')}`;
        if (typeof window !== 'undefined') {
            ((window as any)._logs = (window as any)._logs || []).push(logMsg2);
            const existing = localStorage.getItem('_todo_flow_debug_logs') || '';
            localStorage.setItem('_todo_flow_debug_logs', existing + '\n' + logMsg2);
        }
        console.log(logMsg2);

        const newIndex = this.tasks.findIndex(t => t.id === taskToMove.id);
        if (newIndex !== -1) {
            this.onTaskUpdate?.(this.tasks[newIndex]!);
            return newIndex;
        }
        return index;
    }

    adjustDuration(index: number, deltaMinutes: number): number {
        if (!this.tasks[index] || this.tasks[index].isMissing) return index;
        const taskToMove = this.tasks[index]!;
        const task = { ...taskToMove };

        const currentDuration = task.originalDuration ?? task.duration;
        task.originalDuration = Math.max(2, currentDuration + deltaMinutes);
        task.duration = task.originalDuration; // Reset to original before schedule logic

        const newTasks = [...this.tasks];
        newTasks[index] = task;
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime);

        const newIndex = this.tasks.findIndex(t => t.id === taskToMove.id);
        if (newIndex !== -1) {
            this.onTaskUpdate?.(this.tasks[newIndex]!);
            return newIndex;
        }
        return index;
    }

    moveTaskToIndex(oldIndex: number, newIndex: number): number {
        console.log(`[StackController] moveTaskToIndex(oldIndex: ${oldIndex}, newIndex: ${newIndex})`);
        if (oldIndex === newIndex) return oldIndex;
        if (!this.tasks[oldIndex]) return oldIndex;
        const taskToMove = this.tasks[oldIndex]!;
        if (taskToMove.id.startsWith('temp-')) {
            if (typeof window !== 'undefined') console.warn(`[StackController] moveTaskToIndex BLOCKED: ${taskToMove.id} is temporary`);
            return oldIndex;
        }
        if (taskToMove.isAnchored) return oldIndex;

        const newTasks = [...this.tasks];

        // Remove from old
        newTasks.splice(oldIndex, 1);
        console.log(`[StackController] After splice-out: ${newTasks.map(t => t.title).join(', ')}`);

        // Adjust newIndex if it was after oldIndex
        let target = newIndex;
        newTasks.splice(target, 0, taskToMove);
        console.log(`[StackController] After splice-in: ${newTasks.map(t => t.title).join(', ')}`);

        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime);
        const finalIndex = this.tasks.findIndex(t => t.id === taskToMove.id);
        console.log(`[StackController] Final order: ${this.tasks.map(t => t.title).join(', ')} (moved task now at ${finalIndex})`);
        return finalIndex;
    }

    handleEnter(index: number, forceOpen: boolean = false): { action: 'DRILL_DOWN' | 'OPEN_FILE' | 'GO_BACK'; path?: string; newStack?: TaskNode[] } | null {
        if (!this.tasks[index]) return null;

        const task = this.tasks[index]!;
        if (task.id.startsWith('temp-')) {
            if (typeof window !== 'undefined') console.warn(`[StackController] handleEnter BLOCKED: ${task.id} is temporary`);
            return null;
        }
        if (task.isMissing) return null;

        if (task.children && task.children.length > 0) {
            if (forceOpen) {
                return {
                    action: 'OPEN_FILE',
                    path: task.id
                };
            }
            return {
                action: 'DRILL_DOWN',
                newStack: task.children
            };
        } else {
            // It's a leaf.
            if (forceOpen) {
                return {
                    action: 'OPEN_FILE',
                    path: task.id
                };
            }
            // By default, ALL files are stacks (even empty ones)
            return {
                action: 'DRILL_DOWN',
                newStack: []
            };
        }
    }
}
