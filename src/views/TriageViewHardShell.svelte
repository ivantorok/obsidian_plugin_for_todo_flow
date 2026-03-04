<script lang="ts">
    import { onMount, untrack } from "svelte";
    import { slide } from "svelte/transition";
    import { TriageController } from "./TriageController";
    import type { TaskNode } from "../scheduler.js";

    let {
        app,
        tasks: initialTasks,
        onComplete,
        historyManager,
        logger,
        contentEl,
        checkForConflict,
    } = $props();

    const controller = $derived.by(() => new TriageController(app, initialTasks, logger));
    let currentTask = $state(untrack(() => controller.getCurrentTask()));
    let swipeDirection = $state<"left" | "right" | null>(null);
    let isConflictState = $state(false);

    // Placeholder for swipe state
    let touchStartX = $state(0);
    let touchCurrentX = $state(0);
    let isSwiping = $state(false);

    function next(direction: "left" | "right") {
        swipeDirection = direction;
        // Logic to be poured in Phase 2/3
    }
</script>

<div class="todo-flow-triage-container" tabindex="-1">
    {#if currentTask}
        <div class="triage-card-wrapper {swipeDirection}" transition:slide>
            <div class="todo-flow-card variant-triage">
                <div class="todo-flow-card-body">
                    <h2>{currentTask.title}</h2>
                    <div class="todo-flow-triage-hint">
                        ← Not Now | Shortlist →
                    </div>
                </div>
            </div>
        </div>
    {:else}
        <div class="todo-flow-triage-done">
            <h2>All done!</h2>
            <p>Your shortlist has been updated.</p>
        </div>
    {/if}

    <div class="todo-flow-triage-controls">
        <button onclick={() => next("left")} class="control-btn not-now">← Not Now</button>
        <button class="control-btn undo">Undo</button>
        <button class="control-btn skip-all" title="Move all remaining items to shortlist">Skip All →</button>
        <button onclick={() => next("right")} class="control-btn shortlist">Shortlist →</button>
    </div>
</div>

<style>
    /* STYLES COPIED FROM ShadowTriage.svelte */
    .todo-flow-triage-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 2rem;
        background: var(--background-primary);
        gap: 2rem;
        touch-action: none;
        position: relative;
    }

    .triage-card-wrapper {
        transition: transform 0.2s, opacity 0.2s;
        width: 100%;
        max-width: 400px;
        display: flex;
        justify-content: center;
    }

    .triage-card-wrapper.left { transform: translateX(-100px) rotate(-10deg); opacity: 0; }
    .triage-card-wrapper.right { transform: translateX(100px) rotate(10deg); opacity: 0; }

    .todo-flow-triage-hint {
        margin-top: 1rem;
        color: var(--text-muted);
        font-size: 0.9rem;
    }

    .todo-flow-triage-controls {
        display: flex;
        gap: 0.75rem;
    }

    .control-btn {
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        cursor: pointer;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
        color: var(--text-normal);
        font-size: 0.85rem;
        -webkit-tap-highlight-color: transparent;
    }

    .shortlist {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
    }

    .skip-all {
        background: var(--background-secondary-alt);
        border: 1px dashed var(--interactive-accent);
        opacity: 0.8;
    }

    .todo-flow-card {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        padding: 2rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    .todo-flow-card.variant-triage {
        max-width: 400px;
        height: 300px;
        text-align: center;
    }
    .todo-flow-card-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
    .todo-flow-card-body h2 {
        margin: 0;
        font-size: 1.4rem;
        color: var(--text-normal);
    }
</style>
