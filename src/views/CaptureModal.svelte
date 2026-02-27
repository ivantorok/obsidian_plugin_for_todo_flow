<script lang="ts">
    import { fade } from 'svelte/transition';
    import { formatDuration } from '../utils.ts';
    import { type TaskNode } from '../scheduler.js';

    let { 
        task, 
        onClose, 
        onSave 
    } = $props<{
        task: TaskNode;
        onClose: () => void;
        onSave: (title: string, duration: number) => void;
    }>();

    let newTitle = $state(task.title);
    let newDuration = $state(task.duration);

    function handleSave() {
        onSave(newTitle, newDuration);
        onClose();
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="todo-flow-capture-modal" transition:fade={{ duration: 100 }} onpointerdown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div class="content">
        <div class="header">
            <h2>Edit Task</h2>
            <button class="close-btn" onclick={onClose}>&times;</button>
        </div>
        
        <div class="field">
            <label for="task-title">Title</label>
            <input 
                id="task-title"
                type="text" 
                bind:value={newTitle}
                placeholder="What needs to be done?"
                onkeydown={(e) => { 
                    if (e.key === 'Enter') handleSave(); 
                    if (e.key === 'Escape') onClose(); 
                    e.stopPropagation();
                }}
            />
        </div>

        <div class="field">
            <label for="task-duration">Duration</label>
            <div class="duration-controls">
                <button onclick={() => newDuration = Math.max(5, newDuration - 5)}>−</button>
                <div class="duration-display">{formatDuration(newDuration)}</div>
                <button onclick={() => newDuration += 5}>+</button>
            </div>
        </div>

        <div class="actions">
            <button class="cancel-btn" onclick={onClose}>Cancel</button>
            <button class="save-btn" onclick={handleSave}>Save Changes</button>
        </div>
    </div>
</div>

<style>
    .todo-flow-capture-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        backdrop-filter: blur(4px);
    }

    .content {
        background: var(--background-primary);
        color: var(--text-normal);
        border: 1px solid var(--background-modifier-border);
        border-radius: 12px;
        padding: 24px;
        width: 90%;
        max-width: 400px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    h2 {
        margin: 0;
        font-size: 1.25rem;
        color: var(--text-accent);
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: var(--text-muted);
        cursor: pointer;
        padding: 0;
        line-height:1;
    }

    .field {
        margin-bottom: 20px;
    }

    label {
        display: block;
        font-size: 0.8rem;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 8px;
    }

    input[type="text"] {
        width: 100%;
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        padding: 10px 12px;
        color: var(--text-normal);
        font-size: 1rem;
    }

    .duration-controls {
        display: flex;
        align-items: center;
        gap: 12px;
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        padding: 8px;
    }

    .duration-controls button {
        background: var(--background-modifier-border);
        border: none;
        border-radius: 4px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        color: var(--text-normal);
        cursor: pointer;
    }

    .duration-display {
        flex: 1;
        text-align: center;
        font-weight: 600;
        font-size: 1.1rem;
    }

    .actions {
        display: flex;
        gap: 12px;
        margin-top: 10px;
    }

    .actions button {
        flex: 1;
        padding: 12px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        border: 1px solid transparent;
    }

    .cancel-btn {
        background: transparent;
        border-color: var(--background-modifier-border) !important;
        color: var(--text-muted);
    }

    .save-btn {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
    }
</style>
