<script lang="ts">
    import { formatDuration, formatDateRelative } from "../utils.ts";
    import { getMinDuration } from "../scheduler.js";
    import {
        ScaleDurationCommand,
        ToggleAnchorCommand,
    } from "../commands/stack-commands.js";
    import HelpModal from "./HelpModal.svelte";
    import { type TaskNode } from "../scheduler.js";
    import TaskContextMenu from "./TaskContextMenu.svelte";

    let {
        tasks,
        focusedIndex,
        now,
        historyManager,
        controller,
        editingIndex,
        editingStartTimeIndex,
        renamingText = $bindable(),
        draggingTaskId,
        dragTargetIndex,
        draggingStartIndex,
        isMobileState,

        onTap,
        onPointerStart,
        onPointerMove,
        onPointerEnd,
        onPointerCancel,
        touchBlocking,
        handleTouchBlocking,
        getCardTransform,
        syncGuard,
        startRename,
        finishRename,
        cancelRename,
        startEditStartTime,
        finishEditStartTime,
        selectOnFocus,
        update,
        openQuickAddModal,
        openDurationPicker,

        showContextMenu, 
        contextMenuTask, 
        contextMenuTarget,
        onCloseContextMenu,

        // Bindables for inputs
        renameInputs = $bindable(),
        taskElements = $bindable(),
    } = $props();

    function handleToggleReorder() {
        if (!contextMenuTask) return;
        controller.setNavState({ 
            ...navState, 
            isReorderMode: !navState.isReorderMode 
        });
        onCloseContextMenu();
    }
</script>

<div class="todo-flow-timeline mode-architect" data-testid="architect-timeline">
    {#if tasks.length > 0}
        {#each tasks as task, i (task.id)}
            <div
                bind:this={taskElements[i]}
                class="todo-flow-task-card"
                role="button"
                tabindex="0"
                class:is-mobile={isMobileState}
                class:is-temporary={task.id.startsWith("temp-")}
                data-testid="task-card-{i}"
                class:is-focused={focusedIndex === i}
                data-index={i}
                class:anchored={task.isAnchored}
                class:is-done={task.status === "done"}
                data-status={task.status}
                class:is-missing={task.isMissing}
                class:dragging={draggingTaskId === task.id}
                class:drop-before={dragTargetIndex === i &&
                    i !== draggingStartIndex &&
                    i <= draggingStartIndex}
                class:drop-after={dragTargetIndex === i &&
                    i !== draggingStartIndex &&
                    i > draggingStartIndex}
                onclick={(e) => {
                    if (task.id.startsWith("temp-")) return;
                    onTap(e, task, i);
                }}
                onkeydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        if (task.id.startsWith("temp-")) return;
                        onTap(e as any, task, i);
                    }
                }}
                onpointerdown={(e) => {
                    if (task.id.startsWith("temp-")) return;
                    onPointerStart(e, task.id);
                }}
                onmousedown={(e) => {
                    if (task.id.startsWith("temp-")) return;
                    onPointerStart(e as any, task.id);
                }}
                onpointermove={onPointerMove}
                onmousemove={onPointerMove}
                onpointerup={(e) => {
                    if (task.id.startsWith("temp-")) return;
                    onPointerEnd(e, task);
                }}
                onmouseup={(e) => {
                    if (task.id.startsWith("temp-")) return;
                    onPointerEnd(e as any, task);
                }}
                onpointercancel={onPointerCancel}
                ontouchstart={handleTouchBlocking}
                ontouchmove={handleTouchBlocking}
                use:touchBlocking={handleTouchBlocking}
                style="transform: {getCardTransform(task.id)}; pointer-events: {task.id.startsWith('temp-') ? 'none' : 'auto'};"
            >
                <!-- Sovereign UX: No physical drag handles. The whole card is the gesture surface. -->

                
                <button
                    class="time-col"
                    onpointerdown={(e) => e.stopPropagation()}
                    onclick={(e) => {
                        e.stopPropagation();
                        startEditStartTime(i);
                    }}
                    onkeydown={(e) => {
                        if (e.key === "Enter") {
                            e.stopPropagation();
                            startEditStartTime(i);
                        }
                    }}
                >
                    {#if editingStartTimeIndex === i}
                        <input
                            type="text"
                            class="todo-flow-time-input"
                            value={task.startTime.format("HH:mm")}
                            onkeydown={(e) => {
                                if (e.key === "Enter") {
                                    e.stopPropagation();
                                    finishEditStartTime(task.id, e.currentTarget.value);
                                }
                                if (e.key === "Escape") {
                                    e.stopPropagation();
                                    editingStartTimeIndex = -1;
                                }
                            }}
                            onblur={(e) => finishEditStartTime(task.id, e.currentTarget.value)}
                            use:selectOnFocus
                        />
                    {:else}
                        {formatDateRelative(task.startTime, now, isMobileState)}
                    {/if}
                </button>

                <button
                    class="duration-text"
                    class:is-mobile={isMobileState}
                    onclick={(e) => {
                        e.stopPropagation();
                        if (task.id.startsWith("temp-")) return;
                        openDurationPicker(i);
                    }}
                    onkeydown={(e) => {
                        if (e.key === "Enter") openDurationPicker(i);
                    }}
                    onpointerdown={(e) => e.stopPropagation()}
                >
                    {formatDuration(task.duration)}
                </button>

                {#if editingIndex === i}
                    <input
                        bind:this={renameInputs[i]}
                        bind:value={renamingText}
                        type="text"
                        class="rename-input"
                        data-testid="rename-input"
                        oninput={(e) => { renamingText = e.currentTarget.value; }}
                        onblur={(e) => {
                            if (e.currentTarget.getAttribute("data-blur-ignore") === "true") return;
                        }}
                        onkeydown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") {
                                e.stopPropagation();
                                e.currentTarget.setAttribute("data-blur-ignore", "true");
                                finishRename(task.id, e.currentTarget.value, "submit");
                            }
                            if (e.key === "Escape") {
                                e.stopPropagation();
                                cancelRename();
                            }
                        }}
                        use:selectOnFocus
                    />
                {:else}
                    <button
                        class="title"
                        class:is-done={task.done}
                        data-testid="task-card-title"
                        data-index={i}
                        onclick={syncGuard((e) => {
                            if (!isMobileState) {
                              e.stopPropagation();
                              startRename(i);
                            } else {
                              e.stopPropagation();
                              if (focusedIndex === i) {
                                openCaptureModal(i);
                              }
                            }
                        })}
                        onkeydown={(e) => {
                            if (e.key === "Enter") {
                                e.stopPropagation();
                                startRename(i);
                            }
                        }}
                        title={task.isMissing ? "Note missing" : "Click to rename"}
                        tabindex="0"
                    >
                        {#if task.isMissing}<span class="missing-icon" title="Original note was deleted or moved">⚠️</span>{/if}{task.title}
                    </button>
                {/if}

                <!-- Sovereign UX: State (Anchored) is indicated by border/shadow, not a cluttered column -->

            </div>
        {/each}
    {:else}
        <!-- ZEN MODE: Architect List -->
        <div class="zen-list-empty empty-state" data-testid="zen-list-empty">
            <div class="zen-icon">🏔️</div>
            <h3>Your Architect's Desk is Clear</h3>
            <p>Add a new task to begin your next flow.</p>
            <button
                class="focus-action-btn"
                style="max-width: 200px;"
                onclick={syncGuard(() => openQuickAddModal(-1))}
            >
                Quick Add
            </button>
        </div>
    {/if}

    {#if showContextMenu && contextMenuTask && contextMenuTarget}
        <TaskContextMenu
            isAnchored={contextMenuTask.isAnchored}
            targetElement={contextMenuTarget}
            onOpenDetails={() => {
                if (contextMenuTask) onTap({ stopPropagation: () => {} } as any, contextMenuTask, tasks.indexOf(contextMenuTask));
                showContextMenu = false;
            }}
            onToggleReorder={handleToggleReorder}
            onToggleAnchor={() => {
                if (contextMenuTask) executeGestureAction('anchor', contextMenuTask, tasks.indexOf(contextMenuTask));
                showContextMenu = false;
            }}
            onScaleDuration={(dir) => {
                if (contextMenuTask) executeGestureAction('scale', contextMenuTask, tasks.indexOf(contextMenuTask));
            }}
            onClose={onCloseContextMenu}
        />
    {/if}
</div>

<style>
    @import "../styles/stack-shared.css";

    .todo-flow-timeline {
        display: flex;
        flex-direction: column;
        width: 100%;
        margin: 0;
        min-height: 300px; 
        /* Massive bottom buffer to clear the heightened floating footer (Lift 2) */
        padding-bottom: 200px;
    }

    .todo-flow-timeline.mode-focus {
        justify-content: center;
        align-items: center;
        height: calc(100% - 60px);
        max-width: 600px;
        margin: 0 auto;
    }

    /* Sovereign UX Overrides for the main task card wrapper (Architect Mode ONLY) */
    :global(.todo-flow-timeline.mode-architect .todo-flow-task-card) {
        min-height: 48px; /* High density */
        height: auto;
        margin: 0;
        width: 100%;
        box-sizing: border-box;
        
        /* Naked Text Visuals */
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--background-modifier-border);
        border-radius: 0;
        padding: 0.5rem 0;
        gap: 0.75rem;

        /* Mono-row Enforcement */
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
    }

    .time-col {
        flex: 0 0 auto;
        font-family: var(--font-monospace, 'JetBrains Mono', monospace);
        font-weight: 700;
        font-size: 0.95rem;
        color: var(--interactive-accent);
        padding: 0;
        background: transparent;
        border: none;
        cursor: pointer;
        min-width: 60px;
        text-align: left;
    }

    .duration-text {
        flex: 0 0 auto;
        font-family: var(--font-monospace, 'JetBrains Mono', monospace);
        color: var(--text-muted);
        background: transparent;
        padding: 0;
        border-radius: 0;
        font-size: 0.9rem;
        border: none;
        cursor: pointer;
        margin: 0 0.5rem 0 0;
        font-weight: 500;
    }

    .time-col, .duration-text, .title {
        outline: none !important;
        box-shadow: none !important;
    }

    .rename-input {
        flex: 1 1 auto;
        min-width: 0;
        margin: 0;
    }

    .title {
        width: 100%;
        text-align: left;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        background: none;
        border: none;
        color: var(--text-normal, #ddd);
        font-size: 1rem;
        font-weight: 500;
        padding: 0;
        cursor: pointer;
        margin: 0;
    }

    .anchor-col {
        flex: 0 0 auto;
        margin-left: auto;
    }

    /* States */
    :global(.todo-flow-timeline .todo-flow-task-card.is-done .title),
    :global(.todo-flow-timeline .todo-flow-task-card.is-done .time-col),
    :global(.todo-flow-timeline .todo-flow-task-card.is-done .duration-text) {
        opacity: 0.5;
    }
    
    :global(.todo-flow-timeline .todo-flow-task-card.is-done .title) {
        text-decoration: line-through;
    }

    :global(.todo-flow-timeline .todo-flow-task-card.is-focused) {
        background: rgba(117, 171, 208, 0.15);
        border: 1px solid var(--interactive-accent, #75abd0);
    }
    
    :global(.todo-flow-timeline .todo-flow-task-card.anchored) {
        border-left: 3px solid var(--interactive-accent, #75abd0);
        background: rgba(255, 255, 255, 0.05);
    }

    /* Enhanced Drag Feedback */
    :global(.todo-flow-task-card.dragging) {
        box-shadow: 0 16px 32px rgba(0, 0, 0, 0.2) !important;
        transform: scale(1.05) !important;
        z-index: 9999 !important;
        opacity: 0.9 !important;
        background: var(--interactive-accent) !important;
        color: var(--text-on-accent) !important;
    }

    :global(.todo-flow-task-card.dragging .title) {
        color: var(--text-on-accent) !important;
    }

    :global(.todo-flow-task-card.dragging .drag-handle) {
        color: var(--text-on-accent) !important;
        opacity: 1 !important;
    }
</style>
