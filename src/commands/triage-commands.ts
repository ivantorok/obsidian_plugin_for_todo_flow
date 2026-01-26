import { type Command } from '../history.js';
import { TriageController } from '../views/TriageController.js';

/**
 * Command to swipe a task left or right in triage
 * Captures state before execution to enable undo
 */
export class SwipeCommand implements Command {
    description: string;
    private controller: TriageController;
    private direction: 'left' | 'right';
    private previousIndex: number;

    constructor(controller: TriageController, direction: 'left' | 'right') {
        this.controller = controller;
        this.direction = direction;
        this.description = `Swipe ${direction}`;
        // Capture state before execution
        this.previousIndex = (this.controller as any).index;
    }

    async execute(): Promise<void> {
        if (this.direction === 'left') {
            await this.controller.swipeLeft();
        } else {
            await this.controller.swipeRight();
        }
    }

    undo(): void {
        // Restore previous index and remove the swipe decision
        (this.controller as any).index = this.previousIndex;

        // Remove the task from the appropriate set
        if (this.direction === 'left') {
            (this.controller as any).notNowIndices.delete(this.previousIndex);
        } else {
            (this.controller as any).shortlistIndices.delete(this.previousIndex);
        }
    }
}
