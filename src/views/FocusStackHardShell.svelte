<script lang="ts">
    import { formatDuration, formatDateRelative } from "../utils.ts";
    import moment from "moment";
    import ActionButton from "../components/ActionButton.svelte";
    import { type TaskNode } from "../scheduler.js";
    import { type TodoFlowSettings } from "../main.ts";

    let {
        navState = $bindable(),
        controller,
        now = moment(),
        settings,
        logger,
        onTap,
        executeGestureAction,
        openDurationPicker,
        openQuickAddModal,
        openDetailedView,
        isSyncing = false,
        isPersistenceIdle = true,
        ...restProps
    } = $props();

    const tasks = $derived(navState.tasks);
    const focusedIndex = $derived(navState.focusedIndex);
    const isMobile = $derived(navState.isMobile);

    function syncGuard(fn: any) {
        return (...args: any[]) => {
            if (isSyncing) {
                if ((window as any).Notice) {
                    new (window as any).Notice("Syncing in progress. Please wait...");
                }
                return;
            }
            return fn?.(...args);
        };
    }

    // Public API for StackView.ts
    export function getFocusedIndex() {
        return focusedIndex;
    }

    export function getController() {
        return controller;
    }

    export function update() {
        // Redundant in runes mode but kept for interface parity
    }

    export function setIsMobile(val: boolean) {
        navState.isMobile = val;
    }

    export function updateNow(newNow: moment.Moment) {
        now = newNow;
    }

    export function setTasks(newTasks: TaskNode[]) {
        navState.tasks = newTasks;
    }

    export function getTasks() {
        return navState.tasks;
    }

</script>

<div 
    class="todo-flow-timeline mode-focus todo-flow-stack-container" 
    data-testid="stack-container" 
    data-view-type="focus" 
    data-task-count={tasks.length} 
    data-ui-ready="true" 
    data-focused-index={focusedIndex}
>
    {#if tasks && tasks.length > 0}
        {@const task = tasks[focusedIndex]}
        <div
            class="todo-flow-task-card focus-card hard-shell is-focused"
            role="button"
            tabindex="0"
            class:is-mobile={isMobile}
            class:is-temporary={task.id.startsWith("temp-")}
            data-testid="focus-card"
            class:anchored={task.isAnchored}
            class:is-done={task.status === "done"}
        >
            <div class="index-display">
                #{focusedIndex + 1} of {tasks.length}
            </div>
            
            <div class="focus-card-inner">
                <div class="focus-time-badge">
                    {formatDateRelative(task.startTime, now)}
                </div>

                <!-- SLEEK FOCUS: The Title is the ONLY primary tap target -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <h1 
                    class="focus-title" 
                    onclick={(e) => { 
                        e.stopPropagation(); 
                        if (task.id.startsWith("temp-")) return;
                        openDetailedView(focusedIndex); 
                    }}
                >
                    {task.title || task.id.split('/').pop()?.replace('.md', '') || 'Untitled Task'}
                </h1>

                {#if task.children && task.children.length > 0}
                    <button 
                        class="substack-indicator focus-mode"
                        onclick={(e) => {
                            e.stopPropagation();
                            if (restProps.onNavigate) restProps.onNavigate(task.id, focusedIndex);
                        }}
                    >
                        <span class="count">{task.children.length} subtasks</span>
                        <span class="chevron">›</span>
                    </button>
                {/if}

                <div class="focus-metadata">
                    <span class="focus-duration-text">{formatDuration(task.duration)}</span>
                    {#if task.isAnchored}
                        <span class="focus-anchor-status">⚓ Anchored</span>
                    {/if}
                </div>

                <!-- NAVIGATION ROW: Purged of action buttons -->
                <div class="focus-secondary-actions hard-shell-nav">
                    <ActionButton
                        text="← Previous"
                        variant="secondary"
                        disabled={focusedIndex === 0}
                        onclick={(e: MouseEvent) => {
                            e.stopPropagation();
                            navState.focusedIndex = Math.max(0, focusedIndex - 1);
                        }}
                    />

                    <ActionButton
                        text="Next →"
                        variant="secondary"
                        disabled={focusedIndex >= tasks.length - 1}
                        onclick={(e: MouseEvent) => {
                            e.stopPropagation();
                            navState.focusedIndex = Math.min(tasks.length - 1, focusedIndex + 1);
                        }}
                    />
                </div>
            </div>
        </div>

        <div class="focus-navigation-hints">
            <span class="hint">Tap title to manage task</span>
        </div>
    {:else}
        <!-- ZEN MODE -->
        <div
            class="todo-flow-task-card focus-card zen-card empty-state"
            data-testid="zen-card"
        >
            <div class="zen-icon">✨</div>
            <h1 class="zen-title">All Done</h1>
            <p class="zen-subtitle">Your stack is clear.</p>
            <ActionButton
                text="Add a Task"
                onclick={syncGuard(() => openQuickAddModal(-1))}
            />
        </div>
    {/if}
</div>

<style>
    @import "../styles/stack-shared.css";

    /* Local overrides for Hard Shell specifics */
    .hard-shell-nav {
        margin-top: 2rem;
        justify-content: center;
        gap: 2rem;
        border-top: 1px solid var(--background-modifier-border);
        padding-top: 1.5rem;
    }

    .focus-nav-btn {
        flex: 0 1 auto;
        min-width: 100px;
        background: var(--background-primary-alt);
        border: 1px solid var(--background-modifier-border);
    }

    .substack-indicator.focus-mode {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--background-secondary-alt);
        border: 1px solid var(--background-modifier-border);
        padding: 6px 12px;
        border-radius: 8px;
        cursor: pointer;
        margin: 1rem auto;
        transition: all 0.2s;
        width: fit-content;
    }

    .substack-indicator.focus-mode:hover {
        border-color: var(--interactive-accent);
        background: rgba(117, 171, 208, 0.1);
        transform: translateY(-1px);
    }

    .substack-indicator.focus-mode .count {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--text-normal);
    }

    .substack-indicator.focus-mode .chevron {
        font-size: 1.4rem;
        color: var(--interactive-accent);
        line-height: 1;
    }
</style>
