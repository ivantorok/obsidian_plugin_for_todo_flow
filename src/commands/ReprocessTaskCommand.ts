import type { Command } from '../history.js';
import { StackController } from '../views/StackController.js';
import { DateParser } from '../utils/DateParser.js';
import { type TaskNode } from '../scheduler.js';
import moment from 'moment';

export class ReprocessTaskCommand implements Command {
    private controller: StackController;
    private onUpdate: (task: TaskNode) => void | Promise<void>;
    private affectedIndices: number[] = [];
    public description: string = "Reprocess NLP for Stack";

    constructor(controller: StackController, onUpdate: (task: TaskNode) => void | Promise<void>) {
        this.controller = controller;
        this.onUpdate = onUpdate;
    }

    async execute(): Promise<void> {
        const tasks = this.controller.getTasks();
        let changed = false;

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            if (!task) continue;

            // Safety check: Skip tags
            if (task.title.includes('!manual')) {
                continue;
            }

            const parsed = DateParser.parseTaskInput(task.title);

            let hasChanges = false;
            let newTitle = task.title;
            let newDuration = task.duration;
            let newStartTime = task.startTime;
            let newAnchored = task.isAnchored;

            // Check Title Change (removed parsed text)
            if (parsed.title !== task.title) {
                newTitle = parsed.title;
                hasChanges = true;
            }

            // Check Anchored/Time
            if (parsed.isAnchored && parsed.startTime) {
                if (!task.isAnchored || !task.startTime || (parsed.startTime && !task.startTime.isSame(parsed.startTime))) {
                    newStartTime = parsed.startTime;
                    newAnchored = true;
                    hasChanges = true;
                }
            }

            // Check Duration
            if (parsed.duration !== undefined) {
                if (parsed.duration !== task.duration) {
                    newDuration = parsed.duration;
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                // Apply update via controller
                if (newTitle !== task.title) {
                    this.controller.updateTaskTitle(i, newTitle);
                }

                if (newDuration !== task.duration) {
                    if (this.controller.updateTaskMetadata) {
                        const metadata: { startTime?: moment.Moment, duration?: number, isAnchored?: boolean } = {
                            isAnchored: newAnchored
                        };
                        if (newDuration !== undefined) metadata.duration = newDuration;
                        if (newStartTime !== undefined) metadata.startTime = newStartTime;

                        this.controller.updateTaskMetadata(i, metadata);
                    }
                } else if (hasChanges) {
                    // Just anchor/time changed
                    if (this.controller.updateTaskMetadata) {
                        const metadata: { startTime?: moment.Moment, duration?: number, isAnchored?: boolean } = {
                            isAnchored: newAnchored
                        };
                        if (newStartTime !== undefined) metadata.startTime = newStartTime;

                        this.controller.updateTaskMetadata(i, metadata);
                    }
                }

                // Persist to disk via callback
                const updatedTask = this.controller.getTasks()[i];
                if (updatedTask) {
                    await this.onUpdate(updatedTask);
                    this.affectedIndices.push(i);
                    changed = true;
                }
            }
        }
    }

    async undo(): Promise<void> {
        // Todo: Implement Undo for bulk changes
        console.warn('Undo not implemented for ReprocessTaskCommand');
    }
}
