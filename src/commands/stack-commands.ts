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
