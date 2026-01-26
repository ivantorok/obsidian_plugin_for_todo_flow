/**
 * Command Pattern for Undo/Redo
 */
export interface Command {
    execute(): void | Promise<void>;
    undo(): void;
    description: string;
}

/**
 * Global History Manager
 * Manages undo/redo stacks for all commands across the application
 */
export class HistoryManager {
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];
    private maxStackSize: number = 50; // Prevent memory issues

    /**
     * Execute a command and add it to the undo stack
     * Clears the redo stack (standard undo behavior)
     */
    async executeCommand(command: Command): Promise<void> {
        await command.execute();
        this.undoStack.push(command);
        this.redoStack = []; // Clear redo stack on new action

        // Limit stack size
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }
    }

    /**
     * Undo the last command
     */
    undo(): void {
        const command = this.undoStack.pop();
        if (command) {
            command.undo();
            this.redoStack.push(command);
        }
    }

    /**
     * Redo the last undone command
     */
    redo(): void {
        const command = this.redoStack.pop();
        if (command) {
            command.execute();
            this.undoStack.push(command);
        }
    }

    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /**
     * Clear all history
     */
    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }

    /**
     * Get current stack sizes (for debugging)
     */
    getStackSizes(): { undo: number; redo: number } {
        return {
            undo: this.undoStack.length,
            redo: this.redoStack.length
        };
    }
}
