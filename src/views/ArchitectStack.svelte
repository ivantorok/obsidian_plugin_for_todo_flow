<script lang="ts">
    import { formatDuration, formatDateRelative } from "../utils.ts";
    import { getMinDuration } from "../scheduler.js";
    import {
        ScaleDurationCommand,
        ToggleAnchorCommand,
    } from "../commands/stack-commands.js";
    import HelpModal from "./HelpModal.svelte";
    import { type TaskNode } from "../scheduler.js";

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

        // Bindables for inputs
        renameInputs = $bindable(),
        taskElements = $bindable(),
    } = $props();
</script>

<div class="todo-flow-timeline" data-view-type="architect">
    {#if tasks.length > 0}
        {#each tasks as task, i (task.id)}
            <div
                bind:this={taskElements[i]}
                class="todo-flow-task-card"
                class:is-mobile={isMobileState}
                class:is-temporary={task.id.startsWith("temp-")}
                data-testid="task-card-{i}"
                class:is-focused={focusedIndex === i}
                data-index={i}
                class:anchored={task.isAnchored}
                class:is-done={task.status === "done"}
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
                onpointerdown={(e) => {
                    if (task.id.startsWith("temp-")) return;
                    onPointerStart(e, task.id);
                }}
                onpointermove={onPointerMove}
                onpointerup={(e) => {
                    if (task.id.startsWith("temp-")) return;
                    onPointerEnd(e, task);
                }}
                onpointercancel={onPointerCancel}
                use:touchBlocking={handleTouchBlocking}
                style={isMobileState
                    ? `touch-action: none; transform: ${getCardTransform(task.id)}; flex-wrap: wrap !important; padding: 0.75rem !important; gap: 0.5rem !important; pointer-events: ${task.id.startsWith("temp-") ? "none" : "auto"};`
                    : `touch-action: none; transform: ${getCardTransform(task.id)}; pointer-events: ${task.id.startsWith("temp-") ? "none" : "auto"};`}
            >
                <div
                    class="drag-handle"
                    title="Drag to reorder"
                    style="touch-action: none;"
                >
                    ⠿
                </div>
                <div
                    class="time-col"
                    onpointerdown={(e) => e.stopPropagation()}
                    onclick={(e) => {
                        e.stopPropagation();
                        startEditStartTime(i);
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
                                    finishEditStartTime(
                                        task.id,
                                        e.currentTarget.value,
                                    );
                                }
                                if (e.key === "Escape") {
                                    e.stopPropagation();
                                    editingStartTimeIndex = -1;
                                }
                            }}
                            onblur={(e) =>
                                finishEditStartTime(
                                    task.id,
                                    e.currentTarget.value,
                                )}
                            use:selectOnFocus
                        />
                    {:else}
                        <span class="mobile-only-time"
                            >{formatDateRelative(
                                task.startTime,
                                now,
                                true,
                            )}</span
                        >
                        <span class="desktop-only-time"
                            >{formatDateRelative(task.startTime, now)}</span
                        >
                        {#if task.isAnchored}
                            <svg
                                class="edit-icon"
                                xmlns="http://www.w3.org/2000/svg"
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><path
                                    d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                                ></path><path
                                    d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                                ></path></svg
                            >
                        {/if}
                    {/if}
                </div>
                <div class="content-col" class:mobile-layout={isMobileState}>
                    {#if editingIndex === i}
                        <input
                            bind:this={renameInputs[i]}
                            bind:value={renamingText}
                            type="text"
                            class="rename-input"
                            data-testid="rename-input"
                            onkeydown={(e) => {
                                if (e.key === "Enter") {
                                    e.stopPropagation();
                                    finishRename(
                                        task.id,
                                        renamingText,
                                        "submit",
                                    );
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
                            class:mobile-clamp={isMobileState}
                            style={isMobileState
                                ? "display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal;"
                                : ""}
                            data-testid="task-card-title"
                            data-index={i}
                            onclick={syncGuard(() => startRename(i))}
                            title={task.isMissing
                                ? "Note missing"
                                : "Click to rename"}
                            role="button"
                            tabindex="0"
                        >
                            {#if task.isMissing}<span
                                    class="missing-icon"
                                    title="Original note was deleted or moved"
                                    >⚠️</span
                                >
                            {/if}{task.title}
                        </button>
                    {/if}
                    <div class="metadata" class:mobile-layout={isMobileState}>
                        <div class="duration">
                            <button
                                class="duration-btn minus"
                                onclick={syncGuard((e) => {
                                    e.stopPropagation();
                                    historyManager.executeCommand(
                                        new ScaleDurationCommand(
                                            controller,
                                            i,
                                            "down",
                                        ),
                                    );
                                    update();
                                })}
                                onpointerdown={(e) => e.stopPropagation()}
                                title="Decrease Duration">−</button
                            >
                            <span
                                class="duration-text clickable"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    if (task.id.startsWith("temp-")) return;
                                    openDurationPicker(i);
                                }}
                                onkeydown={(e) => {
                                    if (e.key === "Enter")
                                        openDurationPicker(i);
                                }}
                                onpointerdown={(e) => e.stopPropagation()}
                                tabindex="0"
                                role="button"
                            >
                                {formatDuration(task.duration)}
                            </span>
                            <button
                                class="duration-btn plus"
                                onclick={syncGuard((e) => {
                                    e.stopPropagation();
                                    historyManager.executeCommand(
                                        new ScaleDurationCommand(
                                            controller,
                                            i,
                                            "up",
                                        ),
                                    );
                                    update();
                                })}
                                onpointerdown={(e) => e.stopPropagation()}
                                title="Increase Duration">+</button
                            >
                            {#if getMinDuration(task) > 0}
                                <span
                                    class="constraint-indicator"
                                    title="Constrained by subtasks">⚖️</span
                                >
                            {/if}
                            {#if task.isAnchored}
                                <div class="mobile-anchor-badge">⚓</div>
                            {/if}
                        </div>
                        <div class="anchor-col">
                            {#if !task.isMissing}
                                <button
                                    class="toggle-anchor-btn"
                                    class:is-active={task.isAnchored}
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        if (task.id.startsWith("temp-")) return;
                                        historyManager.executeCommand(
                                            new ToggleAnchorCommand(
                                                controller,
                                                i,
                                            ),
                                        );
                                        update();
                                    }}
                                    onpointerdown={(e) => e.stopPropagation()}
                                    title={task.isAnchored
                                        ? "Release Anchor"
                                        : "Pin to Start Time"}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        ><path
                                            d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"
                                        /><polyline
                                            points="7 10 12 15 17 10"
                                        /><line
                                            x1="12"
                                            y1="15"
                                            x2="12"
                                            y2="3"
                                        /></svg
                                    >
                                </button>
                            {/if}
                        </div>
                    </div>
                </div>
            </div>
        {/each}
    {:else}
        <!-- ZEN MODE: Architect List -->
        <div class="zen-list-empty" data-testid="zen-list-empty">
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
</div>

<style>
    .todo-flow-timeline {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-width: 600px;
        margin: 0 auto;
        min-height: 300px;
    }

    .zen-list-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        text-align: center;
        color: var(--text-muted);
        gap: 1.5rem;
    }

    .zen-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.8;
    }

    .todo-flow-task-card {
        touch-action: none !important;
        user-select: none;
        -webkit-user-select: none;
        position: relative;
        display: flex;
        padding: 1rem;
        background: var(--background-primary);
        border-radius: 0.5rem;
        border: 2px solid transparent;
        gap: 1rem;
        align-items: center;
        transition: all 0.2s;
        opacity: 0.8;
    }

    .todo-flow-task-card.is-focused {
        border-color: var(--interactive-accent);
        opacity: 1;
        transform: scale(1.02);
    }

    .todo-flow-task-card.anchored {
        background: var(--background-secondary-alt);
    }

    .todo-flow-task-card.dragging {
        opacity: 0.7;
        transform: scale(1.02);
        border: 2px solid var(--interactive-accent);
        background: var(--background-primary-alt);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        cursor: grabbing;
    }

    .todo-flow-task-card.drop-before {
        border-top: 3px solid var(--interactive-accent);
    }

    .todo-flow-task-card.drop-after {
        border-bottom: 3px solid var(--interactive-accent);
    }

    .drag-handle {
        cursor: grab;
        color: var(--text-muted);
        padding: 0 0.5rem;
        opacity: 0.5;
        font-size: 1.2rem;
        user-select: none;
        display: flex;
        align-items: center;
    }

    .drag-handle:hover {
        opacity: 1;
        color: var(--interactive-accent);
    }

    .time-col {
        font-family: var(--font-monospace);
        font-size: 0.9rem;
        color: var(--text-muted);
        min-width: 60px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .time-col:hover {
        color: var(--text-accent);
    }

    .edit-icon {
        opacity: 0.4;
        transition: opacity 0.2s;
    }

    .time-col:hover .edit-icon {
        opacity: 1;
    }

    .mobile-only-time {
        display: none;
    }

    .content-col {
        flex: 1;
        min-width: 0;
        width: 0;
        overflow: hidden;
    }

    .title {
        font-weight: 500;
        color: var(--text-normal);
        text-align: left;
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        font-size: 1.1rem;
        width: 100%;
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .title:hover {
        color: var(--text-accent);
    }

    .mobile-anchor-badge {
        display: none;
    }

    .duration {
        font-size: 0.8rem;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.2rem;
    }

    .duration-btn {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        color: var(--text-muted);
        border-radius: 4px;
        padding: 0 0.5rem;
        cursor: pointer;
        font-size: 0.8rem;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        height: 24px;
    }

    .duration-btn:hover {
        background: var(--background-modifier-border-hover);
    }

    .duration-text {
        font-family: var(--font-monospace);
    }

    .constraint-indicator {
        font-size: 0.8rem;
        margin-left: 0.3rem;
        opacity: 0.7;
        cursor: help;
    }

    .is-done {
        opacity: 0.5;
    }
    .is-done .title {
        text-decoration: line-through;
    }

    .is-missing {
        opacity: 0.4;
        background: var(--background-primary-alt);
        border: 1px dashed var(--text-error);
    }
    .is-missing .title {
        color: var(--text-error);
        cursor: default;
    }
    .missing-icon {
        margin-right: 0.5rem;
    }

    .rename-input {
        width: 100%;
        background: var(--background-modifier-form-field);
        border: 1px solid var(--background-modifier-border);
        color: var(--text-normal);
        font-size: 1rem;
        font-weight: 500;
        padding: 2px 4px;
        border-radius: 4px;
    }

    .todo-flow-time-input {
        width: 60px;
        background: var(--background-modifier-form-field);
        border: 1px solid var(--background-modifier-border);
        color: var(--text-normal);
        font-family: var(--font-monospace);
        font-size: 0.9rem;
        padding: 0 2px;
        border-radius: 4px;
    }

    .focus-action-btn {
        flex: 1;
        padding: 0.75rem;
        border-radius: 10px;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
        color: var(--text-normal);
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    /* Mobile overrides */
    @media (max-width: 600px) {
        .todo-flow-task-card {
            flex-wrap: wrap;
            padding: 0.75rem;
            gap: 0.5rem;
        }
        .time-col {
            flex: 1;
            justify-content: flex-start;
            min-width: unset;
        }
        .desktop-only-time {
            display: none;
        }
        .mobile-only-time {
            display: inline;
            font-size: 0.85rem;
            font-weight: 600;
        }
        .content-col {
            order: 2;
            width: 100%;
            flex: none;
        }
        .title {
            white-space: normal;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
        }
        .mobile-anchor-badge {
            display: block;
            font-size: 1rem;
            margin-left: auto;
        }
    }
</style>
