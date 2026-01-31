<script lang="ts">
    import { onMount } from 'svelte';
    import { DumpController } from './DumpController';
    import Card from '../components/Card.svelte';
    import type { App } from 'obsidian';
    import { type TaskNode } from '../scheduler.js';
    import { FileLogger } from '../logger.js';

    export let app: App;
    export let folder: string;
    export let logger: FileLogger;
    export let onComplete: (tasks: TaskNode[]) => void;

    let thought = '';
    let controller: DumpController;
    let inputEl: HTMLTextAreaElement;
    let sessionTasks: TaskNode[] = [];

    onMount(() => {
        controller = new DumpController(app, folder, logger);
        inputEl?.focus();
    });

    async function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const currentThought = thought.trim();
            
            if (currentThought.toLowerCase() === 'done') {
                thought = '';
                if (onComplete) onComplete(sessionTasks);
                return;
            }

            if (currentThought) {
                thought = '';
                const task = await controller.submitThought(currentThought);
                if (task) sessionTasks = [...sessionTasks, task];
            }
        }
    }
</script>

<div class="todo-flow-dump-container">
    <div class="todo-flow-dump-card-wrapper">
        <Card title="Dump your thoughts" variant="dump">
            <textarea
                bind:this={inputEl}
                bind:value={thought}
                on:keydown={handleKeyDown}
                placeholder="Type and press Enter..."
                class="todo-flow-dump-input"
            ></textarea>
            <p class="todo-flow-dump-hint">Type <strong>done</strong> and press Enter to start triage.</p>
        </Card>
    </div>
</div>

<style>
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
        margin: auto; /* Vertically and horizontally stretches to center card while space allows */
        width: 100%;
        max-width: 600px;
    }

    .todo-flow-dump-hint {
        text-align: center;
        color: var(--text-muted);
        font-size: 0.85rem;
        margin-top: 1rem;
        opacity: 0.7;
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
        text-align: center; /* Placeholder can be centered */
        opacity: 0.5;
    }
</style>
