<script lang="ts">
    import { slide } from "svelte/transition";

    let {
        title = "Process: New Plugin Idea"
    } = $props();

    let swipeDirection = $state<"left" | "right" | null>(null);
    let currentTask = $state({ title });

    // Swipe state (simplified)
    let touchStartX = $state(0);
    let touchCurrentX = $state(0);
    let isSwiping = $state(false);
    const SWIPE_THRESHOLD = 100;

    function next(direction: "left" | "right") {
        swipeDirection = direction;
        setTimeout(() => {
            swipeDirection = null;
            currentTask = null;
        }, 300);
    }

    function skipAll() {
        swipeDirection = "right";
        setTimeout(() => {
            swipeDirection = null;
            currentTask = null;
        }, 300);
    }

    function handlePointerStart(e: PointerEvent) {
        touchStartX = e.clientX;
        touchCurrentX = touchStartX;
        isSwiping = true;
    }

    function handlePointerMove(e: PointerEvent) {
        if (!isSwiping) return;
        touchCurrentX = e.clientX;
    }

    function handlePointerEnd() {
        if (!isSwiping) return;
        const deltaX = touchCurrentX - touchStartX;
        if (deltaX > SWIPE_THRESHOLD) next("right");
        else if (deltaX < -SWIPE_THRESHOLD) next("left");
        isSwiping = false;
    }

    const cardTransform = $derived(() => {
        if (!isSwiping) return "";
        const deltaX = touchCurrentX - touchStartX;
        const rotation = deltaX / 20;
        return `translateX(${deltaX}px) rotate(${rotation}deg)`;
    });
</script>

<div class="todo-flow-triage-container" tabindex="-1">
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
        
        <button onclick={() => (currentTask = { title })} class="control-btn undo">Undo</button>
        
        <!-- NEW: Skip All Button from Production -->
        <button 
            onclick={skipAll} 
            class="control-btn skip-all"
            title="Move all remaining items to shortlist"
        >
            Skip All →
        </button>

        <button onclick={() => next("right")} class="control-btn shortlist">Shortlist →</button>
    </div>

    <div class="footer-controls">
        <button class="icon-button plus-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
    </div>
</div>

<style>
    /* COPIED FROM TriageView.svelte */
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
        gap: 0.75rem; /* Tighter gap to fit new button */
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

    /* SKIP ALL styling from TriageView.svelte */
    .skip-all {
        background: var(--background-secondary-alt);
        border: 1px dashed var(--interactive-accent);
        opacity: 0.8;
    }
    .skip-all:hover { opacity: 1; }

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
