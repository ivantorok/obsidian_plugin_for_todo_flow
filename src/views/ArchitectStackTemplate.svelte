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

<div class="todo-flow-timeline" data-testid="architect-timeline">
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
                    <div class="title-row" style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                        {#if editingIndex === i}
                            <input
                                bind:this={renameInputs[i]}
                                bind:value={renamingText}
                                type="text"
                                class="rename-input"
                                data-testid="rename-input"
                                oninput={(e) => {
                                    renamingText = e.currentTarget.value;
                                }}
                                onblur={(e) => {
                                    if (e.currentTarget.getAttribute("data-blur-ignore") === "true") return;
                                }}
                                onkeydown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === "Enter") {
                                        e.stopPropagation();
                                        e.currentTarget.setAttribute("data-blur-ignore", "true");
                                        finishRename(
                                            task.id,
                                            e.currentTarget.value,
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
                                class:is-done={task.done}
                                class:mobile-clamp={isMobileState}
                                style={isMobileState
                                    ? "display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; flex: 1;"
                                    : ""}
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
                            {#if isMobileState}
                                <div class="mobile-index-display">
                                    {i + 1} / {tasks.length}
                                </div>
                            {/if}
                        {/if}
                    </div>
                    
                    <div class="metadata" style={isMobileState ? "display: flex; align-items: center; gap: 0.75rem; margin-top: 4px;" : ""}>
                        <div class="duration">
                            {#if !isMobileState}
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
                            {/if}
                            <button
                                class="duration-text clickable"
                                class:mobile-duration={isMobileState}
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
                            {#if !isMobileState}
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
                            {/if}
                            {#if getMinDuration(task) > 0}
                                <span
                                    class="constraint-indicator"
                                    title="Constrained by subtasks">⚖️</span
                                >
                            {/if}
                        </div>

                        {#if !task.isMissing}
                            <div class="anchor-col" style={isMobileState ? "display: block;" : ""}>
                                <button
                                    class="toggle-anchor-btn"
                                    class:is-active={task.isAnchored}
                                    class:mobile-anchor-btn={isMobileState}
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
                                        width={isMobileState ? "16" : "14"}
                                        height={isMobileState ? "16" : "14"}
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
                            </div>
                        {/if}
                    </div>
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
    @import "../styles/stack-shared.css";

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

    .index-display {
        font-size: 0.8rem;
        color: var(--text-muted);
        opacity: 0.5;
        font-family: var(--font-monospace);
        margin-bottom: -0.5rem;
    }

    .todo-flow-stack-container {
        padding: 2rem;
        background: var(--background-primary);
        outline: none;
        user-select: text;
        height: 100%;
        overflow-y: auto;
        touch-action: pan-y;
        transition: padding-bottom 0.2s ease;
    }

    .todo-flow-stack-container.is-editing {
        padding-bottom: 40vh; /* Reduced from 50vh to avoid ghost space covering inputs */
    }

    /* Mobile Scrollbar Visibility (UI-001) */
    @media (max-width: 768px) {
        .todo-flow-stack-container::-webkit-scrollbar {
            width: 4px;
            display: block !important;
        }
        .todo-flow-stack-container::-webkit-scrollbar-thumb {
            background-color: var(--text-muted);
            border-radius: 10px;
            border: 1px solid transparent;
            background-clip: content-box;
            opacity: 0.3;
        }
    }

    .todo-flow-stack-container.is-dragging {
        user-select: none !important;
        cursor: grabbing !important;
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

    /* Mobile Drag Handle Target (BUG-006) */
    @media (max-width: 600px) {
        :global(.todo-flow-task-card .drag-handle) {
            padding: 0 1rem !important; /* Wider hit area */
            min-width: 44px !important; /* Apple HIG minimum */
            font-size: 1.5rem !important;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    }

    .todo-flow-stack-container.is-dragging * {
        user-select: none !important;
    }
</style>
