<script lang="ts">
    import { onMount, createEventDispatcher, untrack } from "svelte";
    import { StackController } from "./StackController";
    import { type TaskNode, getMinDuration } from "../scheduler.js";
    import moment from "moment";
    import { KeybindingManager } from "../keybindings";
    import { type HistoryManager } from "../history.js";
    import ArchitectStack from "./ArchitectStack.svelte";
    import FocusStack from "./FocusStackHardShell.svelte";
    import StackHeader from "./StackHeader.svelte";
    import DetailedTaskView from "./DetailedTaskView.svelte";
    import {
        ToggleStatusCommand,
        ArchiveCommand,
        ToggleAnchorCommand,
        SetDurationCommand,
        RenameTaskCommand,
    } from "../commands/stack-commands.js";
    import { type StackUIState } from "./ViewTypes.js";

    let {
        navState: externalNavState,
        initialTasks = [],
        persistenceService,
        ...restProps
    } = $props();

    // Use a function to initialize state and avoid local capture warnings for external props/state
    function getInitialNavState(): StackUIState {
        if (externalNavState) return externalNavState;
        return {
            tasks: initialTasks,
            focusedIndex: 0,
            viewMode: "architect",
            parentTaskName: null,
            canGoBack: false,
            rootPath: null,
            isMobile: false,
            isReorderMode: false
        };
    }

    let navState = $state(getInitialNavState());

    const controller = new StackController(
        untrack(() => navState.tasks),
        restProps.now || moment(),
        restProps.onTaskUpdate,
        restProps.onTaskCreate,
        restProps.app,
    );

    $effect(() => {
        const tasks = navState.tasks;
        untrack(() => {
            if (controller && controller.getTasks() !== tasks) {
                controller.setTasks(tasks);
            }
        });
    });

    let viewMode = $derived(navState.viewMode || "architect");
    let showingDetailedView = $state(false);
    let detailedViewTask = $state<TaskNode | null>(null);
    let capturedIndex = $state(-1);
    let activeComponent = $state<any>(null);
    let isSyncing = $state(false);
    let isPersistenceIdle = $state(true);

    export const setIsMobile = (mobile: boolean) => {
        navState.isMobile = mobile;
        if (activeComponent?.setIsMobile) activeComponent.setIsMobile(mobile);
    };

    export const openDetailedView = (index: number) => {
        console.log(`[StackView] openDetailedView called for index ${index}. Total tasks: ${navState.tasks.length}`);
        if (!navState.tasks[index]) {
            console.error(`[StackView] ERROR: No task found at index ${index}`);
            return;
        }
        detailedViewTask = navState.tasks[index];
        capturedIndex = index;
        showingDetailedView = true;
    };

    export const isShowingDetailedView = () => showingDetailedView;


    let navigationHistory = $derived(navState.history || []);
    let internalParentTaskName = $derived(navState.parentTaskName || null);
    let internalCanGoBack = $derived(navState.canGoBack || false);

    $effect(() => {
        if (showingDetailedView && capturedIndex !== -1 && navState.tasks[capturedIndex]) {
            detailedViewTask = navState.tasks[capturedIndex];
        }
    });

    let containerEl = $state<HTMLElement | null>(null);

    export const setIsSyncing = (val: boolean) => {
        isSyncing = val;
        if (activeComponent?.setIsSyncing) activeComponent.setIsSyncing(val);
    };

    export const setIsPersistenceIdle = (val: boolean) => {
        isPersistenceIdle = val;
    };

    export const setViewMode = (mode: "focus" | "architect") => {
        navState.viewMode = mode;
        if (activeComponent?.setViewMode) activeComponent.setViewMode(mode);
    };

    export const getViewMode = () => {
        return navState.viewMode;
    };

    export const setNavState = (newState: StackUIState) => {
        // Update properties individually to preserve reactivity of the $state object
        navState.tasks = newState.tasks;
        navState.focusedIndex = newState.focusedIndex;
        navState.viewMode = newState.viewMode;
        navState.parentTaskName = newState.parentTaskName;
        navState.canGoBack = newState.canGoBack;
        navState.rootPath = newState.rootPath;
        navState.isMobile = newState.isMobile;
        navState.isReorderMode = newState.isReorderMode || false;

        if (activeComponent?.setNavState) activeComponent.setNavState(newState);
    };

    export const setTasks = (newTasks: TaskNode[]) => {
        navState.tasks = newTasks;
        controller.setTasks(newTasks);
        if (activeComponent?.setTasks) activeComponent.setTasks(newTasks);
    };

    export const setFocus = (index: number) => {
        navState.focusedIndex = index;
        if (activeComponent?.setFocus) activeComponent.setFocus(index);
    };


    export const getController = () => {
        return activeComponent?.getController?.() || null;
    };

    export const resolveTempId = (tempId: string, realId: string) => {
        if (activeComponent?.resolveTempId)
            activeComponent.resolveTempId(tempId, realId);
    };

    export const updateSettings = (newSettings: TodoFlowSettings) => {
        if (activeComponent?.updateSettings)
            activeComponent.updateSettings(newSettings);
    };

    export const updateNow = (newNow: moment.Moment) => {
        if (activeComponent?.updateNow) activeComponent.updateNow(newNow);
    };

    export const update = () => {
        if (activeComponent?.update) activeComponent.update();
    };

    export const refreshMobileDetection = () => {
        if (activeComponent?.refreshMobileDetection)
            activeComponent.refreshMobileDetection();
    };

    export const getFocusedIndex = () => {
        return activeComponent?.getFocusedIndex?.() ?? 0;
    };

    export const startRename = (index: number) => {
        if (activeComponent?.startRename) activeComponent.startRename(index);
    };

    async function executeGestureAction(
        action: string,
        task: TaskNode,
        index: number,
    ) {
        if (!action || action === "none") return;

        let cmd;
        if (action === "complete") {
            cmd = new ToggleStatusCommand(controller, index);
            await restProps.historyManager.executeCommand(cmd);
            if (restProps.onTaskUpdate) await restProps.onTaskUpdate(controller.tasks[index]);
            if ((window as any).Notice)
                new (window as any).Notice(`Task: ${task.title} toggled`);
        } else if (action === "archive") {
            cmd = new ArchiveCommand(
                controller, 
                index, 
                async (t) => {
                    const { onTaskUpdate } = restProps;
                    if (onTaskUpdate) await onTaskUpdate(t);
                },
                persistenceService
            );
            await restProps.historyManager.executeCommand(cmd);
            if ((window as any).Notice)
                new (window as any).Notice(`Archived: ${task.title}`);
        } else if (action === "anchor") {
            cmd = new ToggleAnchorCommand(controller, index);
            await restProps.historyManager.executeCommand(cmd);
            if (restProps.onTaskUpdate) await restProps.onTaskUpdate(controller.tasks[index]);
            if ((window as any).Notice)
                new (window as any).Notice(
                    `${task.isAnchored ? "Released" : "Anchored"}: ${task.title}`,
                );
        } else if (action === "open") {
            if (restProps.onNavigate) restProps.onNavigate(task.id, index);
        } else if (action === "context_menu") {
            if (activeComponent?.openContextMenu) activeComponent.openContextMenu(index);
        }

        if (cmd && cmd.resultIndex !== undefined && cmd.resultIndex !== null) {
            navState.tasks = [...controller.tasks]; // Force Svelte reactivity update

            navState.focusedIndex = cmd.resultIndex;
            // Advance focus if completing in focus mode
            if (action === "complete" && viewMode === "focus") {
                const oldIdx = navState.focusedIndex;
                navState.focusedIndex = Math.min(
                    navState.tasks.length - 1,
                    navState.focusedIndex + 1,
                );
            }
            if (restProps.onStackChange) restProps.onStackChange(navState.tasks, navState.focusedIndex);
        } else if (action === "archive") {
            navState.tasks = [...controller.tasks];
            
            navState.focusedIndex = Math.max(
                0,
                Math.min(navState.tasks.length - 1, navState.focusedIndex),
            );
            if (restProps.onStackChange) restProps.onStackChange(navState.tasks, navState.focusedIndex);
        }
    }


    export const handleKeyDown = async (e: KeyboardEvent) => {
        if (activeComponent?.handleKeyDown) await activeComponent.handleKeyDown(e);
    };


    async function handleDetailedUpdate(updatedTask: TaskNode) {
        if (!detailedViewTask) return;
        if (restProps.onTaskUpdate) await restProps.onTaskUpdate(updatedTask);
        // Force reactivity update for the tasks array
        navState.tasks = [...controller.tasks];
    }

    async function handleDetailedDurationChange(minutes: number) {
        if (!detailedViewTask) return;
        const cmd = new SetDurationCommand(controller, capturedIndex, minutes);
        await restProps.historyManager.executeCommand(cmd);
        if (restProps.onTaskUpdate) await restProps.onTaskUpdate(controller.tasks[capturedIndex]);
        navState.tasks = [...controller.tasks];
    }

    async function handleDetailedTitleChange(newTitle: string) {
        if (!detailedViewTask) return;
        const cmd = new RenameTaskCommand(controller, capturedIndex, newTitle);
        await restProps.historyManager.executeCommand(cmd);
        if (restProps.onTaskUpdate) await restProps.onTaskUpdate(controller.tasks[capturedIndex]);
        navState.tasks = [...controller.tasks];
    }

    async function handleSubtaskCreation(title: string) {
        if (!detailedViewTask) return;
        await controller.createSubtask(capturedIndex, title);
        // After subtask creation, we don't necessarily need to force a refresh here
        // as the vault change watcher will eventually pick up the modified parent file
        // and update the indicators. However, we can hint to the view to update.
        if (restProps.onTaskUpdate) {
            // Re-sync parent metadata to ensure it's fresh
            await restProps.onTaskUpdate(controller.getTasks()[capturedIndex]);
        }
    }
</script>

<div
    bind:this={containerEl}
    class="todo-flow-view-wrapper todo-flow-stack-container"
    data-testid="stack-view-container"
    data-ui-ready="true"
    data-view-mode={viewMode}
    data-task-count={navState.tasks.length}
    data-is-syncing={isSyncing}
    data-persistence-idle={isPersistenceIdle}
>
    <StackHeader
        bind:navState
        {internalCanGoBack}
        onGoBack={() => restProps.onGoBack?.()}
        {navigationHistory}
        {internalParentTaskName}
        {isSyncing}
    />

    {#if viewMode === "focus"}
        <FocusStack
            {...restProps}
            bind:navState
            {controller}
            {executeGestureAction}
            {isSyncing}
            {isPersistenceIdle}
            {openDetailedView}
            bind:this={activeComponent}
        />
    {:else}
        <ArchitectStack
            {...restProps}
            bind:navState
            {controller}
            {executeGestureAction}
            {persistenceService}
            {isSyncing}
            {isPersistenceIdle}
            {openDetailedView}
            onStackChange={restProps.onStackChange}
            bind:this={activeComponent}
        />
    {/if}

    {#if showingDetailedView && detailedViewTask}
        <DetailedTaskView 
            task={detailedViewTask} 
            onClose={() => { showingDetailedView = false; detailedViewTask = null; if (containerEl) containerEl.focus(); }} 
            onTaskUpdate={handleDetailedUpdate}
            onDurationChange={handleDetailedDurationChange}
            onTitleChange={handleDetailedTitleChange}
            onToggleAnchor={() => executeGestureAction('anchor', detailedViewTask!, capturedIndex)}
            onDrillDown={() => executeGestureAction('open', detailedViewTask!, capturedIndex)}
            onComplete={() => executeGestureAction('complete', detailedViewTask!, capturedIndex)}
            onArchive={() => executeGestureAction('archive', detailedViewTask!, capturedIndex)}
            onUndo={() => { restProps.historyManager.undo(); navState.tasks = [...controller.tasks]; }}
            onAddSubtask={handleSubtaskCreation}
            onProjectClick={() => restProps.onProjectClick?.(detailedViewTask, capturedIndex)}
        />
    {/if}
</div>

<style>
    .todo-flow-stack-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
    }
</style>
