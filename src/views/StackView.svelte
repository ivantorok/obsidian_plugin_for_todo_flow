<script lang="ts">
    import { onMount, createEventDispatcher, untrack } from "svelte";
    import { StackController } from "./StackController";
    import { type TaskNode, getMinDuration } from "../scheduler.js";
    import moment from "moment";
    import { KeybindingManager } from "../keybindings";
    import { type HistoryManager } from "../history.js";
    import ArchitectStack from "./ArchitectStack.svelte";
    import FocusStack from "./FocusStack.svelte";
    import StackHeader from "./StackHeader.svelte";
    import {
        ToggleStatusCommand,
        ArchiveCommand,
        ToggleAnchorCommand,
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
    let activeComponent = $state<any>(null);
    let isSyncing = $state(false);
    let isPersistenceIdle = $state(true);

    let navigationHistory = $derived(navState.history || []);
    let internalParentTaskName = $derived(navState.parentTaskName || null);
    let internalCanGoBack = $derived(navState.canGoBack || false);

    export function setIsSyncing(val: boolean) {
        isSyncing = val;
        if (activeComponent?.setIsSyncing) activeComponent.setIsSyncing(val);
    }

    export function setIsPersistenceIdle(val: boolean) {
        isPersistenceIdle = val;
    }

    export function setViewMode(mode: "focus" | "architect") {
        navState.viewMode = mode;
        if (activeComponent?.setViewMode) activeComponent.setViewMode(mode);
    }

    export function getViewMode() {
        return navState.viewMode;
    }

    export function setNavState(newState: StackUIState) {
        // Update properties individually to preserve reactivity of the $state object
        navState.tasks = newState.tasks;
        navState.focusedIndex = newState.focusedIndex;
        navState.viewMode = newState.viewMode;
        navState.parentTaskName = newState.parentTaskName;
        navState.canGoBack = newState.canGoBack;
        navState.rootPath = newState.rootPath;
        navState.isMobile = newState.isMobile;

        if (activeComponent?.setNavState) activeComponent.setNavState(newState);
    }

    export function setTasks(newTasks: TaskNode[]) {
        navState.tasks = newTasks;
        controller.setTasks(newTasks);
        if (activeComponent?.setTasks) activeComponent.setTasks(newTasks);
    }

    export function setFocus(index: number) {
        navState.focusedIndex = index;
        if (activeComponent?.setFocus) activeComponent.setFocus(index);
    }

    export function setIsMobile(mobile: boolean) {
        navState.isMobile = mobile;
        if (activeComponent?.setIsMobile) activeComponent.setIsMobile(mobile);
    }

    export function getController() {
        return activeComponent?.getController?.() || null;
    }

    export function resolveTempId(tempId: string, realId: string) {
        if (activeComponent?.resolveTempId)
            activeComponent.resolveTempId(tempId, realId);
    }

    export function updateSettings(newSettings: TodoFlowSettings) {
        if (activeComponent?.updateSettings)
            activeComponent.updateSettings(newSettings);
    }

    export function updateNow(newNow: moment.Moment) {
        if (activeComponent?.updateNow) activeComponent.updateNow(newNow);
    }

    export function update() {
        if (activeComponent?.update) activeComponent.update();
    }

    export function refreshMobileDetection() {
        if (activeComponent?.refreshMobileDetection)
            activeComponent.refreshMobileDetection();
    }

    export function getFocusedIndex() {
        return activeComponent?.getFocusedIndex?.() ?? 0;
    }

    export function startRename(index: number) {
        if (activeComponent?.startRename) activeComponent.startRename(index);
    }

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


    export async function handleKeyDown(e: KeyboardEvent) {
        if (activeComponent?.handleKeyDown) await activeComponent.handleKeyDown(e);
    }
</script>

<div
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
            onStackChange={restProps.onStackChange}
            bind:this={activeComponent}
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
