import moment from 'moment';
import { computeSchedule, getMinDuration, type TaskNode } from '../scheduler.js';
import { ProcessGovernor } from '../services/ProcessGovernor.js';
import { type App } from 'obsidian';

const DURATION_SEQUENCE = [2, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480];

export class StackController {
    private tasks: TaskNode[];
    private currentTime: moment.Moment;
    private onTaskUpdate: ((task: TaskNode) => void) | undefined;
    private onTaskCreate: ((title: string) => TaskNode) | undefined;
    private isFrozen: boolean = false;
    private pendingTasks: TaskNode[] | null = null;
    private pendingActions: Map<string, Array<() => void>> = new Map();
    private governor: ProcessGovernor | undefined;

    constructor(
        initialTasks: TaskNode[],
        currentTime: moment.Moment,
        onTaskUpdate?: (task: TaskNode) => void,
        onTaskCreate?: (title: string) => TaskNode,
        app?: App
    ) {
        this.currentTime = currentTime;
        this.onTaskUpdate = onTaskUpdate;
        this.onTaskCreate = onTaskCreate;
        if (app) {
            this.governor = ProcessGovernor.getInstance(app);
        }
        const highPressureInit: boolean = this.governor?.isHighPressure() ?? false;
        this.tasks = computeSchedule(initialTasks, currentTime, { highPressure: highPressureInit });
    }

    updateTime(newTime: moment.Moment) {
        this.currentTime = newTime;
        if (!this.isFrozen) {
            this.tasks = computeSchedule(this.tasks, this.currentTime, { highPressure: !!this.governor?.isHighPressure() });
        }
    }

    freeze() {
        this.isFrozen = true;
    }

    unfreeze() {
        this.isFrozen = false;
        const highPressure = !!this.governor?.isHighPressure();
        if (this.pendingTasks) {
            this.tasks = computeSchedule(this.pendingTasks, this.currentTime, { highPressure });
            this.pendingTasks = null;
        } else {
            this.tasks = computeSchedule(this.tasks, this.currentTime, { highPressure });
        }
    }

    get now(): moment.Moment {
        return this.currentTime;
    }

    getTasks(): TaskNode[] {
        return this.tasks;
    }

    setTasks(tasks: TaskNode[]) {
        if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[StackController] setTasks called with ${tasks.length} tasks, isFrozen: ${this.isFrozen}`);
        const tempNodes = this.tasks.filter(t => t.id.startsWith('temp-'));
        const resolvedTasks = [...tasks];

        for (const temp of tempNodes) {
            if (!resolvedTasks.find(t => t.id === temp.id)) {
                resolvedTasks.unshift(temp);
            }
        }

        const highPressure = !!this.governor?.isHighPressure();
        if (this.isFrozen) {
            this.pendingTasks = resolvedTasks;
        } else {
            this.tasks = computeSchedule(resolvedTasks, this.currentTime, { highPressure });
            this.pendingTasks = null;
        }
    }

    /**
     * Resolves a temporary ID to a real file path.
     * Updates the task in memory and flushes any pending actions.
     */
    resolveTempId(tempId: string, realId: string) {
        const index = this.tasks.findIndex(t => t.id === tempId);
        if (index === -1) {
            console.error(`[StackController] resolveTempId FAILED: ${tempId} not found in current tasks. Current tasks: ${this.tasks.map(t => t.id).join(', ')}`);
            return;
        }

        console.log(`[StackController] Resolving ${tempId} -> ${realId}`);

        // 1. Capture pending actions BEFORE we change the ID
        const actions = this.pendingActions.get(tempId);

        // 2. Update the ID in memory
        this.tasks[index]!.id = realId;

        // 3. Flush actions (which should now correctly find the task by realId if they retry)
        if (actions) {
            console.log(`[StackController] Flushing ${actions.length} pending actions for ${realId}`);
            actions.forEach(action => action());
            this.pendingActions.delete(tempId);
        }

        // 4. Final update
        this.onTaskUpdate?.(this.tasks[index]!);
    }

    private queueAction(id: string, action: () => void) {
        if (!id.startsWith('temp-')) {
            action();
            return;
        }

        const actions = this.pendingActions.get(id) || [];
        actions.push(action);
        this.pendingActions.set(id, actions);
        console.log(`[StackController] Queued action for ${id}. Pending: ${actions.length}`);
    }

    moveUp(index: number): number {
        if (index <= 0) return index;
        const taskToMove = this.tasks[index];
        if (!taskToMove) return index;

        if (taskToMove.id.startsWith('temp-')) {
            this.queueAction(taskToMove.id, () => {
                const refreshedIndex = this.tasks.findIndex(t => t.id === taskToMove.id);
                if (refreshedIndex !== -1) this.moveUp(refreshedIndex);
            });
            return index;
        }

        if (taskToMove.isAnchored) return index;

        let target = index - 1;
        while (target >= 0 && this.tasks[target]?.isAnchored) {
            target--;
        }

        if (target < 0) return index;

        const newTasks = [...this.tasks];
        [newTasks[index], newTasks[target]] = [newTasks[target]!, newTasks[index]!];

        const highPressure = !!this.governor?.isHighPressure();
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime, { highPressure });

        return this.tasks.findIndex(t => t.id === taskToMove.id);
    }

    moveDown(index: number): number {
        if (index >= this.tasks.length - 1) return index;
        const taskToMove = this.tasks[index];
        if (!taskToMove) return index;

        if (taskToMove.id.startsWith('temp-')) {
            this.queueAction(taskToMove.id, () => {
                const refreshedIndex = this.tasks.findIndex(t => t.id === taskToMove.id);
                if (refreshedIndex !== -1) this.moveDown(refreshedIndex);
            });
            return index;
        }

        if (taskToMove.isAnchored) return index;

        let target = index + 1;
        while (target < this.tasks.length && this.tasks[target]?.isAnchored) {
            target++;
        }

        if (target >= this.tasks.length) return index;

        const newTasks = [...this.tasks];
        [newTasks[index], newTasks[target]] = [newTasks[target]!, newTasks[index]!];

        const highPressure = !!this.governor?.isHighPressure();
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime, { highPressure });

        return this.tasks.findIndex(t => t.id === taskToMove.id);
    }

    toggleAnchor(index: number, startTime?: moment.Moment): number {
        if (!this.tasks[index] || this.tasks[index].isMissing) return index;
        const taskToMove = this.tasks[index]!;
        const id = taskToMove.id;

        if (id.startsWith('temp-')) {
            this.queueAction(id, () => {
                const refreshedIndex = this.tasks.findIndex(t => t.id === id);
                if (refreshedIndex !== -1) this.toggleAnchor(refreshedIndex, startTime);
            });
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

        const highPressure = !!this.governor?.isHighPressure();
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime, { highPressure });

        const newIndex = this.tasks.findIndex(t => t.id === id);
        if (newIndex !== -1) {
            this.onTaskUpdate?.(this.tasks[newIndex]!);
            return newIndex;
        }
        return index;
    }

    toggleStatus(index: number): number {
        if (!this.tasks[index] || this.tasks[index].isMissing) return index;
        const taskToMove = this.tasks[index]!;
        const id = taskToMove.id;

        if (id.startsWith('temp-')) {
            this.queueAction(id, () => {
                const refreshedIndex = this.tasks.findIndex(t => t.id === id);
                if (refreshedIndex !== -1) this.toggleStatus(refreshedIndex);
            });
            return index;
        }

        const task = { ...taskToMove };
        task.status = task.status === 'todo' ? 'done' : 'todo';

        const newTasks = [...this.tasks];
        newTasks[index] = task;

        const highPressure = !!this.governor?.isHighPressure();
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime, { highPressure });

        const newIndex = this.tasks.findIndex(t => t.id === id);
        if (newIndex !== -1) {
            this.onTaskUpdate?.(this.tasks[newIndex]!);
            return newIndex;
        }
        return index;
    }

    updateTaskTitle(index: number, newTitle: string): number {
        if (!this.tasks[index] || this.tasks[index].isMissing) return index;
        const taskToMove = this.tasks[index]!;
        const id = taskToMove.id;

        if (id.startsWith('temp-')) {
            this.queueAction(id, () => {
                const refreshedIndex = this.tasks.findIndex(t => t.id === id);
                if (refreshedIndex !== -1) this.updateTaskTitle(refreshedIndex, newTitle);
            });
            return index;
        }

        const task = { ...taskToMove };
        task.title = newTitle;

        const newTasks = [...this.tasks];
        newTasks[index] = task;

        const highPressure = !!this.governor?.isHighPressure();
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime, { highPressure });

        const newIndex = this.tasks.findIndex(t => t.id === id);
        if (newIndex !== -1) {
            this.onTaskUpdate?.(this.tasks[newIndex]!);
            return newIndex;
        }
        return index;
    }

    updateTaskMetadata(index: number, updates: { startTime?: moment.Moment | undefined, duration?: number | undefined, isAnchored?: boolean | undefined }): number {
        if (!this.tasks[index] || this.tasks[index].isMissing) return index;
        const taskToMove = this.tasks[index]!;
        const id = taskToMove.id;

        if (id.startsWith('temp-')) {
            this.queueAction(id, () => {
                const refreshedIndex = this.tasks.findIndex(t => t.id === id);
                if (refreshedIndex !== -1) this.updateTaskMetadata(refreshedIndex, updates);
            });
            return index;
        }

        const task = { ...taskToMove };

        if (updates.startTime !== undefined) task.startTime = updates.startTime;
        if (updates.duration !== undefined) {
            task.duration = updates.duration;
            task.originalDuration = updates.duration;
        }
        if (updates.isAnchored !== undefined) task.isAnchored = updates.isAnchored;

        const newTasks = [...this.tasks];
        newTasks[index] = task;

        const highPressure = !!this.governor?.isHighPressure();
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime, { highPressure });

        const newIndex = this.tasks.findIndex(t => t.id === id);
        if (newIndex !== -1) {
            this.onTaskUpdate?.(this.tasks[newIndex]!);
            return newIndex;
        }
        return index;
    }

    updateTaskById(id: string, updates: Partial<TaskNode>): number {
        if (id.startsWith('temp-')) {
            this.queueAction(id, () => {
                const refreshedIndex = this.tasks.findIndex(t => t.id === id);
                if (refreshedIndex !== -1) this.updateTaskById(id, updates);
            });
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
        if (updates.status !== undefined) task.status = updates.status;

        const newTasks = [...this.tasks];
        newTasks[index] = task;

        const highPressure = !!this.governor?.isHighPressure();
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime, { highPressure });

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
        newTasks.splice(index + 1, 0, newTask);

        const highPressure = !!this.governor?.isHighPressure();
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime, { highPressure });

        const newIndex = this.tasks.findIndex(t => t.id === newTask.id);

        return { task: newTask, index: newIndex };
    }

    removeTask(index: number) {
        if (!this.tasks[index]) return;
        const newTasks = [...this.tasks];
        newTasks.splice(index, 1);
        const highPressure = !!this.governor?.isHighPressure();
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime, { highPressure });
    }

    insertTask(index: number, task: TaskNode) {
        const newTasks = [...this.tasks];
        newTasks.splice(index, 0, task);
        const highPressure = !!this.governor?.isHighPressure();
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime, { highPressure });
    }

    insertAfter(index: number, task: TaskNode): number {
        const newTasks = [...this.tasks];
        newTasks.splice(index + 1, 0, task);

        const highPressure = !!this.governor?.isHighPressure();
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime, { highPressure });

        return this.tasks.findIndex(t => t.id === task.id);
    }

    scaleDuration(index: number, direction: 'up' | 'down'): number {
        if (!this.tasks[index] || this.tasks[index].isMissing) return index;
        const taskToMove = this.tasks[index]!;
        const id = taskToMove.id;

        if (id.startsWith('temp-')) {
            this.queueAction(id, () => {
                const refreshedIndex = this.tasks.findIndex(t => t.id === id);
                if (refreshedIndex !== -1) this.scaleDuration(refreshedIndex, direction);
            });
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

        const highPressure = !!this.governor?.isHighPressure();
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime, { highPressure });

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
        const id = taskToMove.id;

        if (id.startsWith('temp-')) {
            this.queueAction(id, () => {
                const refreshedIndex = this.tasks.findIndex(t => t.id === id);
                if (refreshedIndex !== -1) this.adjustDuration(refreshedIndex, deltaMinutes);
            });
            return index;
        }

        const task = { ...taskToMove };

        const currentDuration = task.originalDuration ?? task.duration;
        task.originalDuration = Math.max(2, currentDuration + deltaMinutes);
        task.duration = task.originalDuration;

        const newTasks = [...this.tasks];
        newTasks[index] = task;

        const highPressure = !!this.governor?.isHighPressure();
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime, { highPressure });

        const newIndex = this.tasks.findIndex(t => t.id === taskToMove.id);
        if (newIndex !== -1) {
            this.onTaskUpdate?.(this.tasks[newIndex]!);
            return newIndex;
        }
        return index;
    }

    moveTaskToIndex(oldIndex: number, newIndex: number): number {
        if (oldIndex === newIndex) return oldIndex;
        if (!this.tasks[oldIndex]) return oldIndex;
        const taskToMove = this.tasks[oldIndex]!;

        if (taskToMove.id.startsWith('temp-')) {
            this.queueAction(taskToMove.id, () => {
                const refreshedIndex = this.tasks.findIndex(t => t.id === taskToMove.id);
                // Note: newIndex might have shifted, but for simple reorder it's okay for now.
                if (refreshedIndex !== -1) this.moveTaskToIndex(refreshedIndex, newIndex);
            });
            return oldIndex;
        }

        if (taskToMove.isAnchored) return oldIndex;

        const newTasks = [...this.tasks];
        newTasks.splice(oldIndex, 1);
        newTasks.splice(newIndex, 0, taskToMove);
        const highPressure = !!this.governor?.isHighPressure();
        this.tasks = this.isFrozen ? newTasks : computeSchedule(newTasks, this.currentTime, { highPressure });
        return this.tasks.findIndex(t => t.id === taskToMove.id);
    }

    handleEnter(index: number, forceOpen: boolean = false): { action: 'DRILL_DOWN' | 'OPEN_FILE' | 'GO_BACK'; path?: string; newStack?: TaskNode[] } | null {
        if (!this.tasks[index]) return null;

        const task = this.tasks[index]!;
        if (task.id.startsWith('temp-')) return null;
        if (task.isMissing) return null;

        if (task.children && task.children.length > 0) {
            if (forceOpen) {
                return { action: 'OPEN_FILE', path: task.id };
            }
            return { action: 'DRILL_DOWN', newStack: task.children };
        } else {
            if (forceOpen) {
                return { action: 'OPEN_FILE', path: task.id };
            }
            return { action: 'DRILL_DOWN', newStack: [] };
        }
    }
}
