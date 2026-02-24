import type { TaskNode } from "../scheduler.js";
import {
    MoveTaskCommand,
    ToggleAnchorCommand,
    ScaleDurationCommand,
    ToggleStatusCommand,
    DeleteTaskCommand,
    ArchiveCommand,
    RenameTaskCommand,
    SetStartTimeCommand
} from "../commands/stack-commands.js";
import type { KeyboardManagerConfig } from "./GestureTypes.js";

export class StackKeyboardManager {
    constructor(private config: KeyboardManagerConfig) { }

    async handleKeyDown(e: KeyboardEvent) {
        const {
            isSyncing,
            getTasks,
            getFocusedIndex,
            setFocusedIndex,
            isMobileState,
            getSettings,
            logger,
            isMounted,
            isShowHelp,
            setShowHelp,
            getEditingIndex,
            getEditingStartTimeIndex,
            onOpenFile,
            onGoBack,
            onNavigate,
            onFocusChange,
            openQuickAddModal,
            onExport,
            onTaskUpdate,
            historyManager,
            controller,
            update,
            startRename,
            startEditStartTime,
            clearTapTimer
        } = this.config;

        if (typeof window !== "undefined") {
            ((window as any)._logs = (window as any)._logs || []).push(
                `[StackKeyboardManager] handleKeyDown ENTRY: key="${e.key}", target=${(e.target as HTMLElement).tagName}.${(e.target as HTMLElement).className}`,
            );
        }

        if (isSyncing()) {
            if (typeof window !== "undefined")
                ((window as any)._logs = (window as any)._logs || []).push(
                    `[StackKeyboardManager] handleKeyDown BLOCKED: Syncing`,
                );
            new (window as any).Notice("Syncing in progress. Please wait...");
            return;
        }

        const initialFocus = getFocusedIndex();

        const settings = getSettings();
        if (logger && settings.debug)
            logger.info(
                `[TODO_FLOW_TRACE] handleKeyDown entry: key="${e.key}", shift=${e.shiftKey}, target=${(e.target as HTMLElement).tagName}, active=${document.activeElement?.tagName}`,
            );

        // Robust Interference Check:
        const target = e.target as HTMLElement;
        const active = document.activeElement as HTMLElement;

        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
            if (logger) logger.info(`[TODO_FLOW_TRACE] handleKeyDown: IGNORED (target is input)`);
            return;
        }

        if (target.isContentEditable || (active && active.isContentEditable)) {
            if (logger) logger.info(`[TODO_FLOW_TRACE] handleKeyDown: IGNORED (contentEditable)`);
            return;
        }

        if (!isMounted()) {
            if (typeof window !== "undefined")
                ((window as any)._logs = (window as any)._logs || []).push(`[StackKeyboardManager] handleKeyDown BLOCKED: !isMounted`);
            return;
        }

        // We assume keyManager is part of settings or passed separately. 
        // In the original, it was `keyManager = new KeybindingManager(internalSettings.keybindings)`.
        // Let's assume the caller provides a resolved action or we pass keyManager.
        // For now, let's use the controller's or settings' keybindings.
        // Use getter from config
        const keyManager = (this.config as any).getKeyManager();
        if (!keyManager) {
            if (logger) logger.warn("[StackKeyboardManager] handleKeyDown: keyManager is undefined");
            return;
        }

        const action = keyManager.resolveAction(e);
        if (typeof window !== "undefined") {
            ((window as any)._logs = (window as any)._logs || []).push(
                `[StackKeyboardManager] KeyDown: ${e.key} (Shift=${e.shiftKey}) -> Action: ${action} (Focused: ${initialFocus})`,
            );
        }

        clearTapTimer();

        if (!action) return;

        if (isShowHelp()) {
            if (action === "TOGGLE_HELP" || action === "CANCEL") {
                setShowHelp(false);
                e.stopPropagation();
            }
            return;
        }

        if (action === "TOGGLE_HELP") {
            setShowHelp(true);
            e.stopPropagation();
            return;
        }

        if (getEditingIndex() !== -1 || getEditingStartTimeIndex() !== -1) {
            return;
        }

        e.preventDefault();
        e.stopImmediatePropagation();

        if (action === "UNDO") {
            historyManager.undo();
            update();
            return;
        }

        if (action === "REDO") {
            historyManager.redo();
            update();
            return;
        }

        const focusedIndex = initialFocus;
        const tasks = getTasks();

        switch (action) {
            case "RENAME":
                startRename(focusedIndex);
                break;

            case "EDIT_START_TIME":
                startEditStartTime(focusedIndex);
                break;

            case "FORCE_OPEN":
                const forceResult = controller.handleEnter(focusedIndex, true);
                if (forceResult && forceResult.action === "OPEN_FILE" && forceResult.path) {
                    onOpenFile(forceResult.path);
                }
                break;

            case "GO_BACK":
                onGoBack();
                break;

            case "CONFIRM":
                const navResult = controller.handleEnter(focusedIndex);
                if (navResult && navResult.action === "DRILL_DOWN") {
                    const task = tasks[focusedIndex];
                    if (task) {
                        onNavigate(task.id, focusedIndex);
                    }
                }
                break;

            case "NAV_DOWN":
                if (tasks.length > 0) {
                    const newIndex = Math.min(tasks.length - 1, focusedIndex + 1);
                    setFocusedIndex(newIndex);
                    if (onFocusChange) onFocusChange(newIndex);
                }
                break;

            case "NAV_UP":
                if (tasks.length > 0) {
                    const newIndex = Math.max(0, focusedIndex - 1);
                    setFocusedIndex(newIndex);
                    if (onFocusChange) onFocusChange(newIndex);
                }
                break;

            case "MOVE_DOWN":
                const cmdDown = new MoveTaskCommand(controller, focusedIndex, "down");
                await historyManager.executeCommand(cmdDown);
                if (cmdDown.resultIndex !== null) setFocusedIndex(cmdDown.resultIndex);
                update();
                break;

            case "MOVE_UP":
                const cmdUp = new MoveTaskCommand(controller, focusedIndex, "up");
                await historyManager.executeCommand(cmdUp);
                if (cmdUp.resultIndex !== null) setFocusedIndex(cmdUp.resultIndex);
                update();
                break;

            case "ANCHOR":
                const cmdAnchor = new ToggleAnchorCommand(controller, focusedIndex);
                await historyManager.executeCommand(cmdAnchor);
                if (cmdAnchor.resultIndex !== null) setFocusedIndex(cmdAnchor.resultIndex);
                update();
                break;

            case "DURATION_UP":
                const cmdDurUp = new ScaleDurationCommand(controller, focusedIndex, "up");
                await historyManager.executeCommand(cmdDurUp);
                if (cmdDurUp.resultIndex !== null) setFocusedIndex(cmdDurUp.resultIndex);
                update();
                break;

            case "DURATION_DOWN":
                const cmdDurDown = new ScaleDurationCommand(controller, focusedIndex, "down");
                await historyManager.executeCommand(cmdDurDown);
                if (cmdDurDown.resultIndex !== null) setFocusedIndex(cmdDurDown.resultIndex);
                update();
                break;

            case "TOGGLE_DONE":
                const cmdStatus = new ToggleStatusCommand(controller, focusedIndex);
                await historyManager.executeCommand(cmdStatus);
                if (cmdStatus.resultIndex !== null) setFocusedIndex(cmdStatus.resultIndex);
                update();
                break;

            case "CREATE_TASK":
            case "QUICK_ADD":
                openQuickAddModal(focusedIndex);
                break;

            case "DELETE_TASK":
                const taskToDelete = tasks[focusedIndex];
                if (taskToDelete && confirm(`Delete task "${taskToDelete.title}"?`)) {
                    await historyManager.executeCommand(new DeleteTaskCommand(controller, focusedIndex));
                    setFocusedIndex(Math.max(0, focusedIndex - 1));
                    new (window as any).Notice(`Deleted: ${taskToDelete.title}`);
                    update();
                }
                break;

            case "ARCHIVE":
                const taskToArchive = tasks[focusedIndex];
                if (taskToArchive) {
                    await historyManager.executeCommand(
                        new ArchiveCommand(controller, focusedIndex, async (t) => { await onTaskUpdate(t); }, (this.config as any).persistenceService)
                    );
                    setFocusedIndex(Math.max(0, Math.min(tasks.length - 1, focusedIndex)));
                    new (window as any).Notice(`Archived: ${taskToArchive.title}`);
                    update();
                }
                break;

            case "EXPORT":
                onExport(tasks);
                break;
        }

        const finalFocus = getFocusedIndex();
        if (initialFocus !== finalFocus && onFocusChange) {
            onFocusChange(finalFocus);
        }
    }
}
