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
        // Collect IDs first to avoid mutation issues during iteration
        const taskIds = this.controller.getTasks().map(t => t.id);
        let changed = false;

        for (const id of taskIds) {
            // Re-fetch the task from the controller by ID to get the freshest state (in case previous iterations moved it)
            const tasks = this.controller.getTasks();
            const task = tasks.find(t => t.id === id);

            if (!task) continue;

            // Safety check: Skip tags
            if (task.title.includes('!manual')) {
                continue;
            }

            const parsed = DateParser.parseTaskInput(task.title, this.controller.now);

            let hasChanges = false;
            const updates: { title?: string, startTime?: moment.Moment, duration?: number, isAnchored?: boolean } = {};

            // Check Title Change (removed parsed text)
            if (parsed.title !== task.title) {
                updates.title = parsed.title;
                hasChanges = true;
            }

            // Check Anchored/Time
            if (parsed.isAnchored && parsed.startTime) {
                if (!task.isAnchored || !task.startTime || (parsed.startTime && !task.startTime.isSame(parsed.startTime))) {
                    updates.startTime = parsed.startTime;
                    updates.isAnchored = true;
                    hasChanges = true;
                }
            }

            // Check Duration
            if (parsed.duration !== undefined) {
                if (parsed.duration !== task.duration) {
                    updates.duration = parsed.duration;
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                // Apply update via ID-based method to prevent coordinate-scrambling during re-sort
                const resultIndex = this.controller.updateTaskById(id, updates);

                if (resultIndex !== -1) {
                    const updatedTask = this.controller.getTasks()[resultIndex];
                    if (updatedTask) {
                        await this.onUpdate(updatedTask);
                        this.affectedIndices.push(resultIndex);
                        changed = true;
                    }
                }
            }
        }
    }

    async undo(): Promise<void> {
        // Todo: Implement Undo for bulk changes
        console.warn('Undo not implemented for ReprocessTaskCommand');
    }
}
