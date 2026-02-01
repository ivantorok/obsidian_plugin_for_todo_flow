import { type Command } from '../history.js';
import { StackController } from '../views/StackController.js';
import { type TaskNode } from '../scheduler.js';

/**
 * Command to move a task up or down in the stack
 */
export class MoveTaskCommand implements Command {
    description: string;
    private controller: StackController;
    private index: number;
    private direction: 'up' | 'down';
    public resultIndex: number | null = null;

    constructor(controller: StackController, index: number, direction: 'up' | 'down') {
        this.controller = controller;
        this.index = index;
        this.direction = direction;
        this.description = `Move task ${direction} from index ${index}`;
    }

    execute(): void {
        if (this.direction === 'up') {
            this.resultIndex = this.controller.moveUp(this.index);
        } else {
            this.resultIndex = this.controller.moveDown(this.index);
        }
    }

    undo(): void {
        // To undo a move, we move in the opposite direction
        // But the index changes after the move.
        // If we "Jumped Over", the simple +/- 1 math in undo logic was ALREADY broken for Anchors!
        // The undo logic assumed adjacent swap.
        // FIX: We must swap back from resultIndex to index.
        // We know where we landed (resultIndex). We know where we started (index).
        // So we should just swap valid items at resultIndex and index?
        // But the "move" method logic does a search.
        // Ideally, we implement a direct "Swap(i, j)" method in controller for Undo.
        // But for now, let's try to infer.
        // If I went UP from 5 to 3 (skipped 4).
        // Undo means move DOWN from 3 to 5.
        // If I call moveDown(3), will it skip 4 and land on 5? YES, if 4 is anchor.

        // So we just need to call the opposite move on the RESULT index.

        if (this.resultIndex === null) return; // execution failed or didn't happen

        if (this.direction === 'up') {
            this.controller.moveDown(this.resultIndex);
        } else {
            this.controller.moveUp(this.resultIndex);
        }
    }
}

/**
 * Command to toggle anchor status of a task
 */
export class ToggleAnchorCommand implements Command {
    description: string;
    private controller: StackController;
    private index: number;
    public resultIndex: number | null = null;

    constructor(controller: StackController, index: number) {
        this.controller = controller;
        this.index = index;
        this.description = `Toggle anchor at index ${index}`;
    }

    execute(): void {
        this.resultIndex = this.controller.toggleAnchor(this.index);
    }

    undo(): void {
        if (this.resultIndex === null) return;
        this.controller.toggleAnchor(this.resultIndex);
    }
}

/**
 * Command to scale task duration
 */
export class ScaleDurationCommand implements Command {
    description: string;
    private controller: StackController;
    private index: number;
    private direction: 'up' | 'down';
    public resultIndex: number | null = null;

    constructor(controller: StackController, index: number, direction: 'up' | 'down') {
        this.controller = controller;
        this.index = index;
        this.direction = direction;
        this.description = `Scale duration ${direction} at index ${index}`;
    }

    execute(): void {
        this.resultIndex = this.controller.scaleDuration(this.index, this.direction);
    }

    undo(): void {
        if (this.resultIndex === null) return;
        // To undo a scale, we scale in the opposite direction
        const oppositeDirection = this.direction === 'up' ? 'down' : 'up';
        this.controller.scaleDuration(this.resultIndex, oppositeDirection);
    }
}

/**
 * Command to adjust duration by a fixed delta
 */
export class AdjustDurationCommand implements Command {
    description: string;
    private controller: StackController;
    private index: number;
    private delta: number;
    public resultIndex: number | null = null;

    constructor(controller: StackController, index: number, delta: number) {
        this.controller = controller;
        this.index = index;
        this.delta = delta;
        this.description = `Adjust duration by ${delta}m at index ${index}`;
    }

    execute(): void {
        this.resultIndex = this.controller.adjustDuration(this.index, this.delta);
    }

    undo(): void {
        if (this.resultIndex === null) return;
        this.controller.adjustDuration(this.resultIndex, -this.delta);
    }
}

/**
 * Command to toggle task status (todo/done)
 */
export class ToggleStatusCommand implements Command {
    description: string;
    private controller: StackController;
    private index: number;
    public resultIndex: number | null = null;

    constructor(controller: StackController, index: number) {
        this.controller = controller;
        this.index = index;
        this.description = `Toggle status at index ${index}`;
    }

    execute(): void {
        this.resultIndex = this.controller.toggleStatus(this.index);
    }

    undo(): void {
        if (this.resultIndex === null) return;
        this.controller.toggleStatus(this.resultIndex);
    }
}

/**
 * Command to add a task at a specific position
 */
export class AddTaskCommand implements Command {
    description: string;
    private controller: StackController;
    private index: number;
    private title: string;
    private addedTask: TaskNode | null = null;
    public resultIndex: number | null = null;

    constructor(controller: StackController, index: number, title: string) {
        this.controller = controller;
        this.index = index;
        this.title = title;
        this.description = `Add task "${title}" at index ${index}`;
    }

    execute(): void {
        const result = this.controller.addTaskAt(this.index, this.title);
        if (result) {
            this.addedTask = result.task;
            this.resultIndex = result.index;
        }
    }

    undo(): void {
        if (this.resultIndex !== null) {
            this.controller.removeTask(this.resultIndex);
        } else {
            // Fallback: Remove at index + 1 (assumption based on insert after)
            this.controller.removeTask(this.index + 1);
        }
    }
}

/**
 * Command to delete a task
 */
export class DeleteTaskCommand implements Command {
    description: string;
    private controller: StackController;
    private index: number;
    private deletedTask: TaskNode | null;

    constructor(controller: StackController, index: number) {
        this.controller = controller;
        this.index = index;
        this.deletedTask = controller.getTasks()[index] || null;
        this.description = `Delete task at index ${index}`;
    }

    execute(): void {
        this.controller.removeTask(this.index);
    }

    undo(): void {
        if (this.deletedTask) {
            this.controller.insertTask(this.index, this.deletedTask);
        }
    }
}
/**
 * Command to archive a task (sets flow_state to archived and removes from view)
 */
export class ArchiveCommand implements Command {
    description: string;
    private controller: StackController;
    private index: number;
    private task: TaskNode;
    private onSync: (task: TaskNode) => Promise<void>;

    constructor(controller: StackController, index: number, onSync: (task: TaskNode) => Promise<void>) {
        this.controller = controller;
        this.index = index;
        this.task = controller.getTasks()[index]!;
        this.onSync = onSync;
        this.description = `Archive task at index ${index}`;
    }

    async execute(): Promise<void> {
        // 1. Update metadata in vault
        const updatedTask = { ...this.task, flow_state: 'archived' };
        await this.onSync(updatedTask);
        // 2. Remove from local list
        this.controller.removeTask(this.index);
    }

    async undo(): Promise<void> {
        // 1. Restore metadata in vault
        const restoredTask = { ...this.task, flow_state: 'shortlist' };
        await this.onSync(restoredTask);
        // 2. Insert back into local list
        this.controller.insertTask(this.index, this.task);
    }
}

/**
 * Command to insert an existing task node at a specific position
 */
export class InsertTaskCommand implements Command {
    description: string;
    private controller: StackController;
    private index: number;
    private task: TaskNode;
    public resultIndex: number | null = null;

    constructor(controller: StackController, index: number, task: TaskNode) {
        this.controller = controller;
        this.index = index;
        this.task = task;
        this.description = `Insert task "${task.title}" after index ${index}`;
    }

    execute(): void {
        this.resultIndex = this.controller.insertAfter(this.index, this.task);
    }

    undo(): void {
        if (this.resultIndex !== null) {
            this.controller.removeTask(this.resultIndex);
        }
    }
}

/**
 * Command to move a task to a specific index (Drag & Drop)
 */
export class ReorderToIndexCommand implements Command {
    description: string;
    private controller: StackController;
    private oldIndex: number;
    private newIndex: number;
    private taskId: string;
    public resultIndex: number | null = null;

    constructor(controller: StackController, oldIndex: number, newIndex: number) {
        this.controller = controller;
        this.oldIndex = oldIndex;
        this.newIndex = newIndex;
        const task = controller.getTasks()[oldIndex];
        this.taskId = task ? task.id : '';
        this.description = `Reorder task from ${oldIndex} to ${newIndex}`;
    }

    execute(): void {
        this.resultIndex = this.controller.moveTaskToIndex(this.oldIndex, this.newIndex);
    }

    undo(): void {
        if (this.resultIndex === null) return;
        // To undo, move from where it is now (resultIndex) back to where it was (oldIndex)
        this.controller.moveTaskToIndex(this.resultIndex, this.oldIndex);
    }
}

import { DateParser } from '../utils/DateParser.js';
import moment from 'moment';

/**
 * Command to rename a task
 */
export class RenameTaskCommand implements Command {
    description: string;
    private controller: StackController;
    private taskId: string;
    private oldTitle: string;
    private newTitle: string;
    private oldMetadata: { startTime?: moment.Moment | undefined, duration?: number | undefined, isAnchored: boolean };
    private newMetadata: { startTime?: moment.Moment | undefined, duration?: number | undefined, isAnchored: boolean } | null = null;
    public resultIndex: number | null = null;

    constructor(controller: StackController, index: number, newTitle: string) {
        this.controller = controller;
        const task = controller.getTasks()[index];
        if (!task) throw new Error(`Task not found at index ${index}`);

        this.taskId = task.id;
        this.oldTitle = task.title;
        this.oldMetadata = {
            startTime: task.startTime,
            duration: task.duration,
            isAnchored: task.isAnchored || false
        };

        // NLP Processing
        const parsed = DateParser.parseTaskInput(newTitle, this.controller.now);
        this.newTitle = parsed.title;
        if (parsed.isAnchored || parsed.duration !== undefined) {
            this.newMetadata = {
                startTime: parsed.startTime ?? undefined,
                duration: parsed.duration,
                isAnchored: parsed.isAnchored
            };
        }

        this.description = `Rename task "${this.oldTitle}" to "${this.newTitle}" (ID: ${this.taskId})`;
    }

    execute(): void {
        console.log(`[RenameTaskCommand] Executing for ID ${this.taskId}. New Title: "${this.newTitle}"`);

        // Use ID-based update for the title
        this.resultIndex = this.controller.updateTaskById(this.taskId, { title: this.newTitle });

        if (this.newMetadata && this.resultIndex !== -1 && this.controller.updateTaskMetadata) {
            console.log(`[RenameTaskCommand] Applying extra metadata for ID ${this.taskId}`);
            // Note: updateTaskMetadata still uses index, but since we just got resultIndex from updateTaskById, it's fresh.
            // Ideally updateTaskMetadata should also support ID, but we use resultIndex safely here.
            this.controller.updateTaskMetadata(this.resultIndex, this.newMetadata);
        }
    }

    undo(): void {
        const index = this.controller.updateTaskById(this.taskId, { title: this.oldTitle });
        if (index !== -1 && this.controller.updateTaskMetadata) {
            this.controller.updateTaskMetadata(index, this.oldMetadata);
        }
    }
}

/**
 * Command to set a task's start time explicitly (anchors it)
 */
export class SetStartTimeCommand implements Command {
    description: string;
    private controller: StackController;
    private taskId: string;
    private oldMetadata: { startTime: moment.Moment, isAnchored: boolean };
    private newStartTime: moment.Moment;
    public resultIndex: number | null = null;

    constructor(controller: StackController, index: number, timeString: string) {
        this.controller = controller;
        const task = controller.getTasks()[index];
        if (!task) throw new Error(`Task not found at index ${index}`);

        this.taskId = task.id;
        this.oldMetadata = {
            startTime: moment(task.startTime),
            isAnchored: task.isAnchored || false
        };

        const parsed = DateParser.parseTaskInput(timeString, controller.now);
        if (parsed.startTime) {
            this.newStartTime = parsed.startTime;
        } else {
            // Fallback: try to parse it as raw HH:mm if DateParser failed
            const rawParsed = moment(timeString, ['HH:mm', 'H:mm', 'h:mm a', 'hh:mm a']);
            if (rawParsed.isValid()) {
                this.newStartTime = controller.now.clone().set({
                    hour: rawParsed.hour(),
                    minute: rawParsed.minute(),
                    second: 0,
                    millisecond: 0
                });
            } else {
                throw new Error(`Invalid time format: ${timeString}`);
            }
        }

        this.description = `Set start time of "${task.title}" to ${this.newStartTime.format('HH:mm')}`;
    }

    execute(): void {
        const index = this.controller.getTasks().findIndex(t => t.id === this.taskId);
        if (index !== -1) {
            this.resultIndex = this.controller.updateTaskMetadata(index, {
                startTime: this.newStartTime,
                isAnchored: true
            });
        }
    }

    undo(): void {
        const index = this.controller.getTasks().findIndex(t => t.id === this.taskId);
        if (index !== -1) {
            this.controller.updateTaskMetadata(index, this.oldMetadata);
        }
    }
}
/**
 * Command to set a task's duration explicitly
 */
export class SetDurationCommand implements Command {
    description: string;
    private controller: StackController;
    private taskId: string;
    private oldDuration: number;
    private newDuration: number;
    public resultIndex: number | null = null;

    constructor(controller: StackController, index: number, durationMinutes: number) {
        this.controller = controller;
        const task = controller.getTasks()[index];
        if (!task) throw new Error(`Task not found at index ${index}`);

        this.taskId = task.id;
        this.oldDuration = task.duration;
        this.newDuration = durationMinutes;

        this.description = `Set duration of "${task.title}" to ${durationMinutes}m`;
    }

    execute(): void {
        const index = this.controller.getTasks().findIndex(t => t.id === this.taskId);
        if (index !== -1) {
            this.resultIndex = this.controller.updateTaskMetadata(index, {
                duration: this.newDuration
            });
        }
    }

    undo(): void {
        const index = this.controller.getTasks().findIndex(t => t.id === this.taskId);
        if (index !== -1) {
            this.controller.updateTaskMetadata(index, {
                duration: this.oldDuration
            });
        }
    }
}
