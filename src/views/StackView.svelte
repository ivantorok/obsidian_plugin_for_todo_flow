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
    let isSyncing = $state(false);

    let navigationHistory = $derived(navState.history || []);
    let internalParentTaskName = $derived(navState.parentTaskName || null);
    let internalCanGoBack = $derived(navState.canGoBack || false);

    export function setIsSyncing(val: boolean) {
        isSyncing = val;
        if (activeComponent?.setIsSyncing) activeComponent.setIsSyncing(val);
    }

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


    export function handleKeyDown(e: KeyboardEvent) {
        if (activeComponent?.handleKeyDown) activeComponent.handleKeyDown(e);
    }
</script>

<div
    class="todo-flow-view-wrapper"
    data-testid="stack-view-container"
    data-ui-ready="true"
    data-view-mode={viewMode}
    data-task-count={navState.tasks.length}
    data-is-syncing={isSyncing}
>
    <!-- GLOBAL HEADER: Persistent across Focus/Architect modes -->
    <div class="todo-flow-stack-header">
        <div class="header-left">
            {#if internalCanGoBack}
                <button
                    class="back-nav-btn"
                    onclick={() => restProps.onGoBack?.()}
                    title="Go back to parent"
                    data-testid="back-nav-btn"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><line x1="19" y1="12" x2="5" y2="12"
                        ></line><polyline points="12 19 5 12 12 5"
                        ></polyline></svg
                    >
                </button>
            {/if}

            <div class="breadcrumb-trail">
                {#if navigationHistory.length > 0}
                    <span class="breadcrumb-item root" onclick={() => restProps.onGoBack?.()}
                        >...</span
                    >
                    <span class="breadcrumb-separator">/</span>
                {/if}
                {#if internalParentTaskName}
                    <span
                        class="breadcrumb-item active"
                        data-testid="header-parent-name"
                        >{internalParentTaskName}</span
                    >
                {/if}
            </div>
        </div>

        <div class="header-right">
            <span
                class="sync-sentry"
                class:is-active={isSyncing}
                data-testid="sync-sentry"
                data-is-active={isSyncing}
                title={isSyncing
                    ? "Obsidian Sync Active"
                    : "Obsidian Sync Idle"}>☁️</span
            >
            <button
                class="mode-toggle-btn"
                class:is-active={navState.viewMode === "focus"}
                onclick={() =>
                    (navState.viewMode =
                        navState.viewMode === "focus" ? "architect" : "focus")}
                title={navState.viewMode === "focus"
                    ? "Switch to Architect View"
                    : "Switch to Focus View"}
            >
                {#if navState.viewMode === "focus"}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><line x1="8" y1="6" x2="21" y2="6"></line><line
                            x1="8"
                            y1="12"
                            x2="21"
                            y2="12"
                        ></line><line x1="8" y1="18" x2="21" y2="18"
                        ></line><line x1="3" y1="6" x2="3.01" y2="6"
                        ></line><line x1="3" y1="12" x2="3.01" y2="12"
                        ></line><line x1="3" y1="18" x2="3.01" y2="18"
                        ></line></svg
                    >
                {:else}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                        ></rect><line x1="3" y1="9" x2="21" y2="9"
                        ></line><line x1="9" y1="21" x2="9" y2="9"
                        ></line></svg
                    >
                {/if}
            </button>
            <span class="header-index" title="Current Task Position">
                {navState.focusedIndex + 1} <span class="index-separator">/</span>
                {navState.tasks.length}
            </span>
            <span class="header-time">{moment().format("HH:mm")}</span>
        </div>
    </div>

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
            {persistenceService}
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

    .todo-flow-stack-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: var(--background-secondary);
        border-bottom: 1px solid var(--background-modifier-border);
        flex-shrink: 0;
    }

    .header-left, .header-right {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .back-nav-btn {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        border-radius: 4px;
    }

    .back-nav-btn:hover {
        background: var(--background-modifier-hover);
        color: var(--text-normal);
    }

    .breadcrumb-trail {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.85rem;
        color: var(--text-muted);
    }

    .breadcrumb-item.root {
        cursor: pointer;
    }

    .breadcrumb-item.root:hover {
        color: var(--text-normal);
    }

    .breadcrumb-item.active {
        font-weight: 600;
        color: var(--text-normal);
    }

    .sync-sentry {
        font-size: 0.9rem;
        opacity: 0.3;
        transition: opacity 0.3s;
    }

    .sync-sentry.is-active {
        opacity: 0.9;
        filter: drop-shadow(0 0 2px var(--interactive-accent));
    }

    .mode-toggle-btn {
        background: none;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        padding: 4px 8px;
        cursor: pointer;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        transition: all 0.2s;
    }

    .mode-toggle-btn:hover {
        background: var(--background-modifier-hover);
        color: var(--text-normal);
        border-color: var(--background-modifier-border-hover);
    }

    .mode-toggle-btn.is-active {
        color: var(--interactive-accent);
        background: var(--background-modifier-hover);
        border-color: var(--interactive-accent);
    }

    .header-index {
        font-size: 0.85rem;
        color: var(--text-muted);
        font-family: var(--font-monospace);
        display: flex;
        align-items: center;
        gap: 4px;
        background: var(--background-secondary-alt);
        padding: 2px 8px;
        border-radius: 4px;
    }

    .index-separator {
        opacity: 0.3;
    }

    .header-time {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-normal);
        font-family: var(--font-monospace);
        min-width: 45px;
        text-align: right;
    }
</style>
