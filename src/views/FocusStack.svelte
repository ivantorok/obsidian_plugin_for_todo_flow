<script lang="ts">
    import { formatDuration, formatDateRelative } from "../utils.ts";
    import moment from "moment";
    import { type TaskNode } from "../scheduler.js";
    import { type TodoFlowSettings } from "../main";

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
                new (window as any).Notice(
                    "Syncing in progress. Please wait...",
                );
                return;
            }
            return fn?.(...args);
        };
    }
    export function getFocusedIndex() {
        return focusedIndex;
    }

    export function getController() {
        return controller;
    }

    export function update() {
        // Force refresh if needed
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

<div class="todo-flow-timeline mode-focus todo-flow-stack-container" data-testid="stack-container" data-view-type="focus" data-task-count={tasks.length} data-ui-ready="true" data-focused-index={focusedIndex}>
    {#if tasks && tasks.length > 0}
        <!-- FOCUS MODE: Single Card Centerpiece -->
        {@const task = tasks[focusedIndex]}
        <div
            class="todo-flow-task-card focus-card is-focused"
            role="button"
            tabindex="0"
            class:is-mobile={isMobile}
            class:is-temporary={task.id.startsWith("temp-")}
            data-testid="focus-card"
            class:anchored={task.isAnchored}
            class:is-done={task.status === "done"}
            onclick={(e) => {
                if (task.id.startsWith("temp-")) return;
                onTap(e, task, focusedIndex);
            }}
            onkeydown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    if (task.id.startsWith("temp-")) return;
                    onTap(e as any, task, focusedIndex);
                }
            }}
            style="touch-action: pan-y; pointer-events: {task.id.startsWith(
                'temp-',
            )
                ? 'none'
                : 'auto'};"
        >
            <div class="index-display">
                #{focusedIndex + 1} of {tasks.length}
            </div>
            <div class="focus-card-inner">
                <div class="focus-time-badge">
                    {formatDateRelative(task.startTime, now)}
                </div>

                <h1 class="focus-title">{task.title}</h1>

                <div class="focus-metadata">
                    <span class="focus-duration-text"
                        >{formatDuration(task.duration)}</span
                    >
                    {#if task.isAnchored}
                        <span class="focus-anchor-status">⚓ Anchored</span>
                    {/if}
                </div>

                <div class="focus-actions">
                    <button
                        class="focus-action-btn complete"
                        data-testid="focus-complete-btn"
                        onclick={syncGuard((e) => {
                            e.stopPropagation();
                            executeGestureAction(
                                "complete",
                                task,
                                focusedIndex,
                            );
                        })}
                    >
                        {task.status === "done" ? "Undo" : "Complete"}
                    </button>
                    <button
                        class="focus-action-btn"
                        onclick={syncGuard((e) => {
                            e.stopPropagation();
                            executeGestureAction("archive", task, focusedIndex);
                        })}
                    >
                        Archive
                    </button>
                    <button
                        class="focus-action-btn"
                        class:is-anchored={task.isAnchored}
                        onclick={syncGuard((e) => {
                            e.stopPropagation();
                            executeGestureAction("anchor", task, focusedIndex);
                        })}
                    >
                        {task.isAnchored ? "Release" : "Anchor"}
                    </button>
                </div>
                
                <div class="focus-secondary-actions">
                    <button
                        class="focus-nav-btn"
                        disabled={focusedIndex === 0}
                        onclick={(e) => {
                            e.stopPropagation();
                            navState.focusedIndex = Math.max(0, focusedIndex - 1);
                        }}
                    >
                        ← Previous
                    </button>

                    <button
                        class="focus-action-btn ghost"
                        onclick={syncGuard((e) => {
                            e.stopPropagation();
                            openDurationPicker(focusedIndex);
                        })}
                    >
                        Adjust Time
                    </button>

                    <button
                        class="focus-nav-btn"
                        disabled={focusedIndex >= tasks.length - 1}
                        onclick={(e) => {
                            e.stopPropagation();
                            navState.focusedIndex = Math.min(tasks.length - 1, focusedIndex + 1);
                        }}
                    >
                        Next →
                    </button>
                </div>
            </div>
        </div>

        <div class="focus-navigation-hints">
            <span class="hint">Tap to drill down</span>
        </div>
    {:else}
        <!-- ZEN MODE: Focus Card -->
        <div
            class="todo-flow-task-card focus-card zen-card empty-state"
            data-testid="zen-card"
        >
            <div class="zen-icon">✨</div>
            <h1 class="zen-title">All Done</h1>
            <p class="zen-subtitle">Your stack is clear. Take a breath.</p>
            <button
                class="focus-action-btn complete"
                onclick={syncGuard(() => openQuickAddModal(-1))}
            >
                Add a Task
            </button>
        </div>
    {/if}
</div>


<style>
    @import "../styles/stack-shared.css";
</style>
