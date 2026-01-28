import moment from 'moment';
import { computeSchedule, getMinDuration, type TaskNode } from '../scheduler.js';

const DURATION_SEQUENCE = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480];

export class StackController {
    private tasks: TaskNode[];
    private currentTime: moment.Moment;
    private onTaskUpdate: ((task: TaskNode) => void) | undefined;
    private onTaskCreate: ((title: string) => TaskNode) | undefined;

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
        this.tasks = computeSchedule(this.tasks, this.currentTime);
    }

    getTasks(): TaskNode[] {
        return this.tasks;
    }

    moveUp(index: number): number {
        if (index <= 0) return index;
        if (this.tasks[index]?.isAnchored) return index; // Anchors shouldn't move via list reordering

        // Find previous unanchored task
        let target = index - 1;
        while (target >= 0 && this.tasks[target]?.isAnchored) {
            target--;
        }

        if (target < 0) return index; // No valid slot above

        const taskToMove = this.tasks[index]!;
        const newTasks = [...this.tasks];
        // Swap selection with valid target
        [newTasks[index], newTasks[target]] = [newTasks[target]!, newTasks[index]!];
        this.tasks = computeSchedule(newTasks, this.currentTime);

        // Return the new index of the moved task (it might have been re-sorted)
        return this.tasks.findIndex(t => t.id === taskToMove.id);
    }

    moveDown(index: number): number {
        if (index >= this.tasks.length - 1) return index;
        if (this.tasks[index]?.isAnchored) return index; // Anchors shouldn't move

        // Find next unanchored task
        let target = index + 1;
        while (target < this.tasks.length && this.tasks[target]?.isAnchored) {
            target++;
        }

        if (target >= this.tasks.length) return index; // No valid slot below

        const taskToMove = this.tasks[index]!;
        const newTasks = [...this.tasks];
        // Swap selection with valid target
        [newTasks[index], newTasks[target]] = [newTasks[target]!, newTasks[index]!];
        this.tasks = computeSchedule(newTasks, this.currentTime);

        // Return the new index of the moved task
        return this.tasks.findIndex(t => t.id === taskToMove.id);
    }

    toggleAnchor(index: number, startTime?: moment.Moment): number {
        if (!this.tasks[index]) return index;
        const taskToMove = this.tasks[index]!;
        const task = { ...taskToMove };
        task.isAnchored = !task.isAnchored;
        if (task.isAnchored && startTime) {
            task.startTime = moment(startTime);
        } else if (task.isAnchored) {
            // Anchor at its current calculated start time
            task.startTime = moment(task.startTime);
        }

        const newTasks = [...this.tasks];
        newTasks[index] = task;
        this.tasks = computeSchedule(newTasks, this.currentTime);

        const newIndex = this.tasks.findIndex(t => t.id === taskToMove.id);
        if (newIndex !== -1) {
            this.onTaskUpdate?.(this.tasks[newIndex]!);
            return newIndex;
        }
        return index;
    }

    toggleStatus(index: number): number {
        if (!this.tasks[index]) return index;
        const taskToMove = this.tasks[index]!;
        const task = { ...taskToMove };
        task.status = task.status === 'todo' ? 'done' : 'todo';

        const newTasks = [...this.tasks];
        newTasks[index] = task;
        this.tasks = computeSchedule(newTasks, this.currentTime);

        const newIndex = this.tasks.findIndex(t => t.id === taskToMove.id);
        if (newIndex !== -1) {
            this.onTaskUpdate?.(this.tasks[newIndex]!);
            return newIndex;
        }
        return index;
    }

    updateTaskTitle(index: number, newTitle: string): number {
        if (!this.tasks[index]) return index;
        const taskToMove = this.tasks[index]!;
        const task = { ...taskToMove };
        task.title = newTitle;

        const newTasks = [...this.tasks];
        newTasks[index] = task;
        this.tasks = computeSchedule(newTasks, this.currentTime);

        const newIndex = this.tasks.findIndex(t => t.id === taskToMove.id);
        if (newIndex !== -1) {
            this.onTaskUpdate?.(this.tasks[newIndex]!);
            return newIndex;
        }
        return index;
    }

    addTaskAt(index: number, title: string): { task: TaskNode, index: number } | null {
        if (!this.onTaskCreate) return null;

        const newTask = this.onTaskCreate(title);
        const newTasks = [...this.tasks];
        // Insert AFTER current index
        newTasks.splice(index + 1, 0, newTask);

        this.tasks = computeSchedule(newTasks, this.currentTime);

        // Find the index of the newly added task (in case schedule reordered it, though unlikely for new floating task)
        const newIndex = this.tasks.findIndex(t => t.id === newTask.id);

        return { task: newTask, index: newIndex };
    }

    removeTask(index: number) {
        if (!this.tasks[index]) return;
        const newTasks = [...this.tasks];
        newTasks.splice(index, 1);
        this.tasks = computeSchedule(newTasks, this.currentTime);
    }

    insertTask(index: number, task: TaskNode) {
        const newTasks = [...this.tasks];
        newTasks.splice(index, 0, task);
        this.tasks = computeSchedule(newTasks, this.currentTime);
    }

    insertAfter(index: number, task: TaskNode): number {
        const newTasks = [...this.tasks];
        // Insert AFTER current index
        newTasks.splice(index + 1, 0, task);

        this.tasks = computeSchedule(newTasks, this.currentTime);

        // Find the index of the newly added task
        return this.tasks.findIndex(t => t.id === task.id);
    }

    // Removing renameTask as per remapping, but keeping it for now if needed. 
    // Actually user said "c" is for adding, so rename might need another key if they want it.
    // I'll keep the method but remove the binding.

    scaleDuration(index: number, direction: 'up' | 'down'): number {
        if (!this.tasks[index]) return index;
        const taskToMove = this.tasks[index]!;
        const task = { ...taskToMove };
        const minOfSubtasks = getMinDuration(task);
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
        this.tasks = computeSchedule(newTasks, this.currentTime);

        const newIndex = this.tasks.findIndex(t => t.id === taskToMove.id);
        if (newIndex !== -1) {
            this.onTaskUpdate?.(this.tasks[newIndex]!);
            return newIndex;
        }
        return index;
    }

    handleEnter(index: number, forceOpen: boolean = false): { action: 'DRILL_DOWN' | 'OPEN_FILE' | 'GO_BACK'; path?: string; newStack?: TaskNode[] } | null {
        if (!this.tasks[index]) return null;

        const task = this.tasks[index]!;

        if (!forceOpen && task.children && task.children.length > 0) {
            return {
                action: 'DRILL_DOWN',
                newStack: task.children
            };
        } else {
            return {
                action: 'OPEN_FILE',
                path: task.id
            };
        }
    }
}
