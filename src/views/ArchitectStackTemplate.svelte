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

<div class="todo-flow-timeline" data-testid="architect-timeline" data-view-type="architect" data-task-count={tasks.length}>
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
                            )}</span>
                        <span class="desktop-only-time"
                            >{formatDateRelative(task.startTime, now)}</span>
                    {/if}
                </button>
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
                            onclick={syncGuard((e) => {
                                // Single tap is handled by the parent container's handleTap
                                // but if we are editing text, we might want to start rename
                                if (!isMobileState) {
                                  e.stopPropagation();
                                  startRename(i);
                                }
                            })}
                            title={task.isMissing
                                ? "Note missing"
                                : "Click to rename"}
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
                    {#if !isMobileState}
                        <div class="metadata">
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
                                <button
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
                                >
                                    {formatDuration(task.duration)}
                                </button>
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
                    {/if}
                </div>
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
</div>

<style>
    .todo-flow-timeline {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-width: 600px;
        margin: 0 auto;
        min-height: 300px; /* Ensure content area doesn't collapse */
    }

    .todo-flow-timeline.mode-focus {
        justify-content: center;
        align-items: center;
        height: calc(100% - 60px); /* Fill space below header */
    }

    /* FOCUS MODE STYLES */
    .focus-card {
        width: 90%;
        max-width: 400px;
        background: var(--background-primary-alt);
        border: 2px solid var(--background-modifier-border);
        border-radius: 1.5rem;
        padding: 2.5rem 1.5rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        text-align: center;
        display: flex !important;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1.5rem;
        transition:
            transform 0.1s ease-out,
            border-color 0.3s;
        min-height: 250px;
    }

    /* ZEN MODE STYLES */
    .zen-card {
        background: linear-gradient(
            135deg,
            var(--background-primary-alt),
            var(--background-secondary)
        );
        border: 2px dashed var(--background-modifier-border);
        cursor: default;
    }

    .zen-title {
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
        background: linear-gradient(
            to right,
            var(--text-normal),
            var(--text-accent)
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .zen-subtitle {
        font-size: 1.1rem;
        color: var(--text-muted);
        margin-bottom: 2rem;
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

    .focus-card.anchored {
        border-color: var(--interactive-accent);
        background: var(--background-secondary);
    }

    .focus-card-inner {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .focus-time-badge {
        font-size: 0.85rem;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
        background: var(--background-secondary);
        padding: 4px 12px;
        border-radius: 12px;
        width: fit-content;
        margin: 0 auto;
    }

    .focus-title {
        font-size: 1.8rem;
        margin: 0.5rem 0;
        color: var(--text-normal);
        line-height: 1.2;
        word-break: break-word;
    }

    .focus-metadata {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        color: var(--text-muted);
    }

    .focus-duration-text {
        font-size: 1.1rem;
        font-family: var(--font-monospace);
    }

    .focus-anchor-status {
        color: var(--interactive-accent);
        font-size: 0.9rem;
        font-weight: 600;
    }

    .focus-actions {
        display: flex;
        gap: 1rem;
        width: 100%;
        margin-top: 1rem;
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
</style>
