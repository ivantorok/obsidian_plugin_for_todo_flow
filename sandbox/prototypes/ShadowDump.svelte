<script lang="ts">
    import { onMount } from "svelte";

    let {
        onComplete = () => {}
    } = $props();

    let thought = $state("");
    let inputEl: HTMLTextAreaElement | null = $state(null);
    let sessionTasks = $state<any[]>([]);

    onMount(() => {
        inputEl?.focus();
    });

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const currentThought = thought.trim();

            if (currentThought.toLowerCase() === "done") {
                thought = "";
                onComplete();
                return;
            }

            if (currentThought) {
                sessionTasks = [...sessionTasks, { title: currentThought }];
                thought = "";
            }
        }
    }
</script>

<div class="todo-flow-dump-container">
    <div class="todo-flow-dump-card-wrapper">
        <!-- Shadow Card Structure from Card.svelte -->
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
                    onclick={() => onComplete()}
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
    /* COPIED FROM DumpView.svelte */
    .todo-flow-dump-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        min-height: 100%;
        background: var(--background-primary);
        padding: 1.5rem;
        box-sizing: border-box;
    }

    .todo-flow-dump-card-wrapper {
        margin: auto;
        width: 100%;
        max-width: 600px;
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
        -webkit-tap-highlight-color: transparent;
    }

    /* Card styling from production */
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
    .todo-flow-card-header {
        text-align: center;
        color: var(--text-muted);
        font-weight: 500;
        margin: 0;
        font-size: 1.1rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
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
    }
</style>
