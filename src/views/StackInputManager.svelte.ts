import { RenameTaskCommand, SetStartTimeCommand } from "../commands/stack-commands.js";
import type { InputManagerConfig } from "./GestureTypes.js";

export class StackInputManager {
    private activeRenameId: string | null = null;
    private lastRenameStartTime: number = 0;
    private focusTimer: any = null;

    constructor(private config: InputManagerConfig) { }

    startRename(index: number) {
        if (typeof window !== "undefined")
            ((window as any)._logs = (window as any)._logs || []).push(
                `[StackInputManager] startRename(${index})`,
            );
        if (this.config.logger)
            this.config.logger.info(
                `[StackInputManager] startRename called for index ${index}`,
            );

        this.lastRenameStartTime = Date.now();

        const tasks = this.config.getTasks();
        if (index >= 0 && index < tasks.length && tasks[index]) {
            this.config.setRenamingText(tasks[index].title);
        }

        this.config.setEditingIndex(index);

        // Focus the input on the next tick
        setTimeout(() => {
            const inputs = this.config.getRenameInputs();
            if (inputs && inputs[index]) {
                inputs[index].focus();
                inputs[index].select();
            }
        }, 0);
    }

    async finishRename(
        id: string,
        newTitle: string,
        source: "blur" | "submit" = "submit",
    ) {
        if (typeof window !== "undefined")
            ((window as any)._logs = (window as any)._logs || []).push(
                `[StackInputManager] finishRename(${id}, "${newTitle}", source=${source})`,
            );

        if (source === "blur" && Date.now() - this.lastRenameStartTime < 500) {
            if (this.config.logger)
                this.config.logger.info(
                    `[StackInputManager] finishRename BLOCKED - Premature blur from ${id}`,
                );
            return;
        }

        if (this.activeRenameId === id) {
            if (this.config.logger)
                this.config.logger.info(
                    `[StackInputManager] finishRename BLOCKED - ID ${id} already processing`,
                );
            return;
        }

        const tasks = this.config.getTasks();
        const task = tasks.find((t) => t.id === id);
        if (!task || id.startsWith("temp-")) {
            if (this.config.logger)
                this.config.logger.info(
                    `[StackInputManager] finishRename BLOCKED - ID ${id} is temporary or missing`,
                );
            return;
        }

        if (this.config.logger)
            this.config.logger.info(
                `[StackInputManager] finishRename entry - ID: ${id}, New Title: "${newTitle}"`,
            );

        try {
            if (newTitle.trim().length > 0 && newTitle !== task.title) {
                this.activeRenameId = id;
                const index = tasks.findIndex((t) => t.id === id);
                if (index === -1) return;

                const cmd = new RenameTaskCommand(this.config.getController(), index, newTitle);
                await this.config.getHistoryManager().executeCommand(cmd);
                this.config.update();
            }
        } finally {
            this.config.setEditingIndex(-1);
            this.activeRenameId = null;
            this.restoreContainerFocus();
        }
    }

    cancelRename() {
        if (typeof window !== "undefined")
            ((window as any)._logs = (window as any)._logs || []).push(
                `[StackInputManager] cancelRename()`,
            );
        this.config.setEditingIndex(-1);
        this.restoreContainerFocus();
    }

    startEditStartTime(index: number) {
        this.config.setEditingStartTimeIndex(index);
    }

    async finishEditStartTime(id: string, newTime: string) {
        if (id.startsWith("temp-")) {
            if (this.config.logger)
                this.config.logger.info(
                    `[StackInputManager] finishEditStartTime BLOCKED - ID ${id} is temporary`,
                );
            return;
        }
        const tasks = this.config.getTasks();
        const index = tasks.findIndex((t) => t.id === id);
        if (index === -1) return;

        try {
            if (newTime.trim().length > 0) {
                const cmd = new SetStartTimeCommand(this.config.getController(), index, newTime);
                await this.config.getHistoryManager().executeCommand(cmd);
                this.config.update();
            }
        } catch (e) {
            new (window as any).Notice(`Invalid time: ${newTime}`);
        } finally {
            this.config.setEditingStartTimeIndex(-1);
            this.restoreContainerFocus();
        }
    }

    private restoreContainerFocus() {
        if (this.focusTimer) clearTimeout(this.focusTimer);
        this.focusTimer = setTimeout(() => {
            const containerEl = this.config.getContainerEl();
            containerEl?.focus();
            this.focusTimer = null;
        }, 50);
    }
}
