<script lang="ts">
    import { onMount, createEventDispatcher, untrack } from "svelte";
    import { StackController } from "./StackController";
    import { type TaskNode, getMinDuration } from "../scheduler.js";
    import moment from "moment";
    import { KeybindingManager } from "../keybindings";
    import { type HistoryManager } from "../history.js";
    import ArchitectStack from "./ArchitectStack.svelte";
    import FocusStack from "./FocusStack.svelte";
    import {
        ToggleStatusCommand,
        ArchiveCommand,
        ToggleAnchorCommand,
    } from "../commands/stack-commands.js";
    import { type StackUIState } from "./ViewTypes.js";

    let {
        navState: externalNavState,
        initialTasks = [],
        ...restProps
    } = $props();

    let navState = $state(
        externalNavState || {
            tasks: initialTasks,
            focusedIndex: 0,
            viewMode: "architect",
            parentTaskName: null,
            canGoBack: false,
            rootPath: null,
            isMobile: false,
        },
    );

    const controller = new StackController(
        navState.tasks,
        moment(),
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

    export function setViewMode(mode: "focus" | "architect") {
        navState.viewMode = mode;
        if (activeComponent?.setViewMode) activeComponent.setViewMode(mode);
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
            const controllerAct = activeComponent?.getController?.();
            if (!controllerAct) return;
            cmd = new ArchiveCommand(controllerAct, index, async (t) => {
                const { onTaskUpdate } = restProps;
                if (onTaskUpdate) await onTaskUpdate(t);
            });
            await restProps.historyManager.executeCommand(cmd);
            if ((window as any).Notice)
                new (window as any).Notice(`Archived: ${task.title}`);
        } else if (action === "anchor") {
            const controllerAct = activeComponent?.getController?.();
            if (!controllerAct) return;
            cmd = new ToggleAnchorCommand(controllerAct, index);
            await restProps.historyManager.executeCommand(cmd);
            if (restProps.onTaskUpdate) await restProps.onTaskUpdate(controllerAct.tasks[index]);
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

    export function setIsSyncing(val: boolean) {
        if (activeComponent?.setIsSyncing) activeComponent.setIsSyncing(val);
    }

    export function handleKeyDown(e: KeyboardEvent) {
        if (activeComponent?.handleKeyDown) activeComponent.handleKeyDown(e);
    }
</script>

<div
    class="todo-flow-stack-container"
    data-testid="stack-container"
    data-ui-ready="true"
    data-view-mode={viewMode}
    data-task-count={navState.tasks.length}
>
    {#if viewMode === "focus"}
        <FocusStack
            {...restProps}
            bind:navState
            tasks={navState.tasks}
            focusedIndex={navState.focusedIndex}
            {controller}
            {executeGestureAction}
            bind:this={activeComponent}
        />
    {:else}
        <ArchitectStack
            {...restProps}
            bind:navState
            tasks={navState.tasks}
            focusedIndex={navState.focusedIndex}
            {controller}
            {executeGestureAction}
            bind:this={activeComponent}
        />
    {/if}
</div>
