<script lang="ts">
    import { onMount } from "svelte";
    import { DumpController } from "./DumpController";
    import type { App } from "obsidian";
    import { type TaskNode } from "../scheduler.js";
    import { FileLogger } from "../logger.js";

    let {
        app,
        folder,
        logger,
        onComplete
    } = $props<{
        app: App;
        folder: string;
        logger: FileLogger;
        onComplete: (tasks: TaskNode[]) => void;
    }>();

    let thought = $state("");
    let controller: DumpController;
    let inputEl = $state<HTMLTextAreaElement | null>(null);
    let sessionTasks = $state<TaskNode[]>([]);

    onMount(() => {
        controller = new DumpController(app, folder, logger);
        inputEl?.focus();
    });

    async function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const currentThought = thought.trim();

            if (currentThought.toLowerCase() === "done") {
                thought = "";
                if (onComplete) onComplete(sessionTasks);
                return;
            }

            if (currentThought) {
                const draftThought = thought;
                thought = "";
                const task = await controller.submitThought(currentThought);
                if (task) {
                    sessionTasks = [...sessionTasks, task];
                } else {
                    // Restore thought if submission failed (optional, but good for UX)
                    // though DumpController.submitThought only returns null if empty
                }
            }
        }
    }
</script>

<div class="todo-flow-dump-container">
    <div class="todo-flow-dump-card-wrapper">
        <div class="todo-flow-card variant-dump">
            <h2 class="todo-flow-card-header">Dump your thoughts</h2>
            <div class="todo-flow-card-body">
                <textarea
                    bind:this={inputEl}
                    bind:value={thought}
                    onkeydown={handleKeyDown}
                    placeholder="Type and press Enter..."
                    class="todo-flow-dump-input"
                ></textarea>
                <p class="todo-flow-dump-hint">
                    Press <strong>Enter</strong> after each thought. Type
                    <strong>done</strong> + Enter or tap the button to finish.
                </p>
                <button
                    class="todo-flow-dump-finish-btn"
                    onclick={() => {
                        if (onComplete) onComplete(sessionTasks);
                    }}
                >
                    Finish Dump →
                </button>
            </div>

            {#if sessionTasks.length > 0}
                <div class="session-log">
                    <div class="log-count">{sessionTasks.length} thoughts captured</div>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    /* Hard Shell Standard: Clean, mobile-optimized, flex-aware */
    .todo-flow-dump-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        min-height: 100%;
        background: var(--background-primary);
        padding: 1.5rem;
        /* Stable buffer for mobile status bars */
        padding-top: calc(var(--safe-area-inset-top, 0px) + 2rem);
        padding-bottom: 3rem; /* Extra buffer for keyboard */
        box-sizing: border-box;
        overflow-y: auto;
    }

    .todo-flow-dump-card-wrapper {
        margin: auto;
        width: 100%;
        max-width: 600px;
    }

    /* Card shadow/container matching the ShadowAudit standard */
    .todo-flow-card {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 12px;
        padding: 2rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .todo-flow-card-header {
        text-align: center;
        color: var(--text-muted);
        font-weight: 500;
        margin: 0;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .todo-flow-dump-input {
        width: 100%;
        min-height: 200px;
        font-size: 1.5rem;
        border: none;
        outline: none;
        resize: none;
        background: transparent;
        color: var(--text-normal);
        line-height: 1.6;
        font-family: inherit;
        text-align: left;
    }

    .todo-flow-dump-input::placeholder {
        color: var(--text-muted);
        font-style: italic;
        text-align: center;
        opacity: 0.5;
    }

    .todo-flow-dump-hint {
        text-align: center;
        color: var(--text-muted);
        font-size: 0.85rem;
        margin-top: 1rem;
        opacity: 0.7;
    }

    .todo-flow-dump-finish-btn {
        display: block;
        width: 100%;
        max-width: 320px;
        margin: 1.5rem auto 0;
        padding: 0.85rem 1.5rem;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        letter-spacing: 0.02em;
        -webkit-tap-highlight-color: transparent;
        transition: opacity 0.15s;
    }

    .todo-flow-dump-finish-btn:hover,
    .todo-flow-dump-finish-btn:active {
        opacity: 0.85;
    }

    .session-log {
        margin-top: 1rem;
        border-top: 1px solid var(--background-modifier-border);
        padding-top: 1rem;
        text-align: center;
    }

    .log-count {
        font-size: 0.8rem;
        color: var(--interactive-accent);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
</style>
