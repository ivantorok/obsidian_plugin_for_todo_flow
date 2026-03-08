<script lang="ts">
    import { onMount, untrack } from "svelte";
    import { slide } from "svelte/transition";
    import { TriageController } from "./TriageController";
    import { KeybindingManager } from "../keybindings";
    import type { TaskNode } from "../scheduler.js";
    import ActionButton from "../components/ActionButton.svelte";

    let {
        app,
        tasks: initialTasks,
        keys,
        onComplete,
        historyManager,
        logger,
        contentEl,
        checkForConflict,
        openQuickAddModal,
        // BUG-021: Interaction Shroud — lock persistence during active swipe
        lockPersistence,
        unlockPersistence,
        rootPath,
    } = $props();

    const controller = $derived.by(() => new TriageController(app, initialTasks, logger));
    let currentTask = $state<TaskNode | null>(null);
    let swipeDirection = $state<"left" | "right" | null>(null);
    let isConflictState = $state(false);
    let keyManager: KeybindingManager;

    $effect(() => {
        // Sync currentTask when controller (initialTasks) changes
        currentTask = untrack(() => controller.getCurrentTask());
    });

    onMount(() => {
        keyManager = new KeybindingManager(keys || {
            navUp: [],
            navDown: [],
            moveUp: [],
            moveDown: [],
            anchor: [],
            durationUp: ["ArrowRight"],
            durationDown: ["ArrowLeft"],
            undo: ["u"],
            confirm: [],
            cancel: [],
        });
    });

    // Swipe state
    let touchStartX = $state(0);
    let touchCurrentX = $state(0);
    let isSwiping = $state(false);
    let activeSwipeToken = $state<string | null>(null);
    const SWIPE_THRESHOLD = 100;

    function next(direction: "left" | "right") {
        swipeDirection = direction;
        setTimeout(async () => {
            if (isConflictState) {
                const strategy = direction === "right" ? "merge" : "overwrite";
                onComplete({ ...controller.getResults(), strategy });
                swipeDirection = null;
                return;
            }

            if (direction === "right") await controller.swipeRight();
            else await controller.swipeLeft();
            
            currentTask = controller.getCurrentTask();
            swipeDirection = null;
            
            if (!currentTask) {
                if (checkForConflict && (await checkForConflict())) {
                    isConflictState = true;
                } else {
                    onComplete(controller.getResults());
                }
            }
        }, 200);
    }

    async function skipAll() {
        await controller.skipAllToShortlist();
        currentTask = null;
        
        if (checkForConflict && (await checkForConflict())) {
            isConflictState = true;
        } else {
            onComplete(controller.getResults());
        }
    }

    function undo() {
        historyManager.undo();
        currentTask = controller.getCurrentTask();
    }

    export function handleKeyDown(e: KeyboardEvent) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        
        const action = keyManager.resolveAction(e);
        if (!action) return;

        e.preventDefault();

        if (action === "UNDO") {
            undo();
            return;
        }

        switch (action) {
            case "DURATION_DOWN":
            case "NAV_DOWN":
                next("left");
                break;
            case "DURATION_UP":
            case "NAV_UP":
                next("right");
                break;
            case "CONFIRM":
                controller.openCurrentTask();
                break;
        }
    }

    export function addTaskToQueue(task: TaskNode, persist: boolean = false) {
        if (logger) logger.info(`[TriageViewHardShell] addTaskToQueue: ${task.title}, persist: ${persist}`);
        controller.addTask(task, persist);
        if (!currentTask) {
            currentTask = controller.getCurrentTask();
        }
    }

    function handlePointerStart(e: PointerEvent) {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        touchStartX = e.clientX;
        touchCurrentX = touchStartX;
        isSwiping = true;

        // BUG-021: Lock persistence during swipe to prevent external clobbering
        if (lockPersistence && rootPath) {
            activeSwipeToken = `triage-swipe-${Date.now()}`;
            lockPersistence(rootPath, activeSwipeToken);
        }
    }

    function handlePointerMove(e: PointerEvent) {
        if (!isSwiping) return;
        touchCurrentX = e.clientX;
    }

    function handlePointerEnd(e: PointerEvent) {
        if (!isSwiping) return;
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

        const deltaX = touchCurrentX - touchStartX;
        if (deltaX > SWIPE_THRESHOLD) next("right");
        else if (deltaX < -SWIPE_THRESHOLD) next("left");

        isSwiping = false;
        touchStartX = 0;
        touchCurrentX = 0;

        // BUG-021: Release persistence lock after swipe completes
        if (unlockPersistence && rootPath && activeSwipeToken) {
            unlockPersistence(rootPath, activeSwipeToken);
            activeSwipeToken = null;
        }
    }

    const cardTransform = $derived(() => {
        if (!isSwiping) return "";
        const deltaX = touchCurrentX - touchStartX;
        const rotation = deltaX / 20;
        return `translateX(${deltaX}px) rotate(${rotation}deg)`;
    });
</script>

<div 
    class="todo-flow-triage-container" 
    tabindex="-1"
    onkeydown={handleKeyDown}
>
    {#if currentTask}
        <div 
            class="triage-card-wrapper {swipeDirection}" 
            transition:slide
            onpointerdown={handlePointerStart}
            onpointermove={handlePointerMove}
            onpointerup={handlePointerEnd}
            style:transform={cardTransform()}
        >
            <div class="todo-flow-card variant-triage">
                <h2 class="todo-flow-card-header">{(currentTask?.title || "").toUpperCase()}</h2>
                <div class="todo-flow-card-body">
                    <div class="todo-flow-triage-hint">
                        ← Not Now | Shortlist →
                    </div>
                </div>
            </div>
        </div>
    {:else if isConflictState}
        <div class="triage-card-wrapper {swipeDirection}" transition:slide style:transform={cardTransform()}>
            <div class="todo-flow-card variant-triage">
                <h2 class="todo-flow-card-header">EXISTING STACK DETECTED</h2>
                <div class="todo-flow-card-body">
                    <div class="todo-flow-triage-conflict-message">
                        <p>You have an active Daily Stack.</p>
                    </div>
                    <div class="todo-flow-triage-hint conflict">
                        ← Overwrite (Fresh) | Merge (Append) →
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
        <ActionButton 
            onclick={() => next("left")} 
            text={isConflictState ? "← Overwrite" : "← Not Now"}
            variant={isConflictState ? "danger" : "secondary"}
        />
        
        {#if !isConflictState}
            <ActionButton onclick={undo} text="Undo" variant="secondary" />
            <ActionButton 
                onclick={skipAll} 
                text="Shortlist All →" 
                variant="secondary"
                class="tf-shortlist-all-btn"
            />
        {/if}

        <ActionButton 
            onclick={() => next("right")} 
            text={isConflictState ? "Merge →" : "Shortlist →"}
        />
    </div>

    <div class="footer-controls">
        <button class="icon-button plus-btn" onclick={() => openQuickAddModal()} title="Add Task">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
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

    .footer-controls {
        position: absolute;
        bottom: 60px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        padding: 1.5rem;
        pointer-events: none;
    }

    .footer-controls .icon-button {
        pointer-events: auto;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: var(--interactive-accent);
        color: white;
        border: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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

    /* Conflict Mode Styles */
    .todo-flow-triage-conflict-message {
        padding: 1rem 0;
        text-align: center;
        opacity: 0.8;
    }

    .todo-flow-triage-hint.conflict {
        color: var(--text-warning);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 0.8rem;
        background: rgba(var(--interactive-accent-rgb), 0.1);
        padding: 8px 16px;
        border-radius: 8px;
        border: 1px solid rgba(var(--interactive-accent-rgb), 0.2);
    }

    .conflict-reject {
        background: var(--background-modifier-error);
        color: var(--text-on-accent);
        border-color: var(--background-modifier-error);
    }

    .conflict-resolve {
        background: var(--interactive-success);
        color: var(--text-on-accent);
        border-color: var(--interactive-success);
    }

    .todo-flow-card-header {
        text-align: center;
        color: var(--text-muted);
        font-weight: 500;
        margin: 0;
        font-size: 1.1rem;
        opacity: 0.9;
        text-transform: uppercase;
        letter-spacing: 0.05em;
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
