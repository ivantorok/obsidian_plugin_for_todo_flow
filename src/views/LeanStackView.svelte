<script lang="ts">
    import type { App } from 'obsidian';
    import type { TaskNode } from '../scheduler.js';
    import type { TodoFlowSettings } from '../main.js';
    import type { FileLogger } from '../logger.js';

    interface Props {
        app: App;
        settings: TodoFlowSettings;
        logger: FileLogger;
        onTaskUpdate: (task: TaskNode) => void | Promise<void>;
        onAppendInbox: (text: string) => Promise<void>;
    }

    import { LoopManager } from '../services/LoopManager.js';

    let { 
        settings, 
        logger, 
        onTaskUpdate, 
        onAppendInbox 
    } = $props<Props>();

    let tasks = $state<TaskNode[]>([]);
    let currentIndex = $state(0);
    let loading = $state(true);
    let captureText = $state("");
    let showCapture = $state(false);
    let showVictory = $state(false);

    let currentTask = $derived(tasks[currentIndex]);

    export function setTasks(newTasks: TaskNode[]) {
        tasks = newTasks;
        currentIndex = 0;
        loading = false;
        showVictory = false;
    }

    async function handleDone() {
        if (!currentTask) return;
        
        const updatedTask = { ...currentTask, status: 'done' as const };
        await onTaskUpdate(updatedTask);
        
        nextTask();
    }

    async function handlePark() {
        if (!currentTask) return;
        
        const updatedTask = { ...currentTask, flow_state: 'parked' as const };
        await onTaskUpdate(updatedTask);
        
        nextTask();
    }

    function nextTask() {
        const result = LoopManager.resolveNextIndex(currentIndex, tasks.length, true);
        if (result.showVictory) {
            showVictory = true;
            logger.info("[LeanStackView] Showing Victory Lap card");
        } else {
            currentIndex = result.nextIndex;
        }
    }

    function restartLoop() {
        currentIndex = LoopManager.restartLoop();
        showVictory = false;
        logger.info("[LeanStackView] Loop restarted");
    }

    function closeSession() {
        // @ts-ignore - leaf is available on View but not explicitly in Props here
        // We'll need to pass the view or use app to find the leaf.
        // For simplicity in Svelte, we can dispatch an event or use a callback.
        // But LeanStackView is a View, so it has access to its leaf if we expose it.
        // @ts-ignore
        app.workspace.getLeavesOfType('todo-flow-stack-view').forEach(leaf => {
            // @ts-ignore
            if (leaf.view === this || (leaf.view && (leaf.view as any).view === this)) {
                leaf.detach();
            }
        });
    }

    async function submitCapture() {
        if (!captureText.trim()) return;
        await onAppendInbox(captureText.trim());
        captureText = "";
        showCapture = false;
    }
</script>

<div class="todo-flow-lean-container">
    {#if loading}
        <div class="loading">Loading Stack...</div>
    {:else if tasks.length === 0}
        <div class="empty-state">No tasks in stack.</div>
    {:else if showVictory}
        <div class="victory-card" data-testid="victory-lap-card">
            <h2>Victory Lap! 🏆</h2>
            <div class="summary-list">
                {#each tasks as task}
                    <div class="summary-item {task.status === 'done' ? 'is-done' : ''} {task.flow_state === 'parked' ? 'is-parked' : ''}" data-testid="victory-summary-item">
                        <span class="status-icon">
                            {#if task.status === 'done'}✅{:else if task.flow_state === 'parked'}⏸️{:else}⬜{/if}
                        </span>
                        <span class="title">{task.title}</span>
                    </div>
                {/each}
            </div>
            <div class="victory-actions">
                <button class="action-btn next" data-testid="victory-restart-btn" onclick={restartLoop}>Restart Loop</button>
                <button class="action-btn park" data-testid="victory-close-btn" onclick={closeSession}>Close Session</button>
            </div>
        </div>
    {:else if currentTask}
        <div class="task-card" data-testid="lean-task-card">
            <div class="task-title" data-testid="lean-task-title">{currentTask.title}</div>
            <div class="task-meta">
                {#if currentTask.duration}
                    <span class="duration">{currentTask.duration}m</span>
                {/if}
            </div>
            
            <div class="actions">
                <button class="action-btn done" data-testid="lean-done-btn" onclick={handleDone}>DONE</button>
                <button class="action-btn park" data-testid="lean-park-btn" onclick={handlePark}>PARK</button>
                <button class="action-btn next" data-testid="lean-next-btn" onclick={nextTask}>NEXT</button>
            </div>
        </div>
    {/if}

    <!-- Capture FAB -->
    <button class="fab-btn" data-testid="lean-capture-fab" onclick={() => showCapture = !showCapture}>+</button>

    {#if showCapture}
        <div class="capture-overlay" data-testid="lean-capture-overlay" onclick={({ target, currentTarget }) => target === currentTarget && (showCapture = false)}>
            <div class="capture-modal">
                <textarea 
                    bind:value={captureText} 
                    placeholder="New Idea..."
                    data-testid="lean-capture-input"
                    autofocus
                ></textarea>
                <div class="capture-actions">
                    <button class="mod-cta" data-testid="lean-submit-capture" onclick={submitCapture}>Capture</button>
                    <button data-testid="lean-cancel-capture" onclick={() => showCapture = false}>Cancel</button>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .todo-flow-lean-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 20px;
        position: relative;
        background-color: var(--background-primary);
    }

    .task-card {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        border: 1px solid var(--background-modifier-border);
        border-radius: 12px;
        padding: 40px;
        background-color: var(--background-secondary);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .task-title {
        font-size: 2.5em;
        font-weight: bold;
        margin-bottom: 10px;
        color: var(--text-normal);
    }

    .task-meta {
        font-size: 1.2em;
        color: var(--text-muted);
        margin-bottom: 40px;
    }

    .actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        width: 100%;
        max-width: 400px;
    }

    .action-btn {
        padding: 20px;
        font-size: 1.5em;
        font-weight: bold;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        transition: transform 0.1s;
    }

    .action-btn:active {
        transform: scale(0.95);
    }

    .done {
        background-color: var(--interactive-success);
        color: white;
        grid-column: span 2;
    }

    .park {
        background-color: var(--interactive-accent);
        color: white;
    }

    .action-btn.next {
        background-color: var(--background-modifier-border);
        color: var(--text-normal);
        grid-column: span 2;
    }

    .victory-card {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        border: 2px solid var(--interactive-success);
        border-radius: 12px;
        padding: 30px;
        background-color: var(--background-secondary);
        overflow-y: auto;
    }

    .summary-list {
        width: 100%;
        margin: 20px 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .summary-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 12px;
        border-radius: 8px;
        background-color: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        font-size: 1.1em;
        text-align: left;
    }

    .summary-item.is-done {
        opacity: 0.7;
        background-color: var(--background-modifier-success);
    }

    .summary-item.is-parked {
        opacity: 0.7;
        background-color: var(--background-modifier-accent);
    }

    .victory-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        width: 100%;
        max-width: 400px;
        margin-top: auto;
    }

    .fab-btn {
        position: absolute;
        bottom: 30px;
        right: 30px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: var(--interactive-accent);
        color: white;
        font-size: 30px;
        border: none;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
    }

    .capture-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding-top: 100px;
        z-index: 1000;
    }

    .capture-modal {
        background-color: var(--background-primary);
        padding: 20px;
        border-radius: 12px;
        width: 90%;
        max-width: 500px;
        display: flex;
        flex-direction: column;
        gap: 15px;
    }

    textarea {
        width: 100%;
        height: 100px;
        padding: 10px;
        border-radius: 8px;
        border: 1px solid var(--background-modifier-border);
        background-color: var(--background-secondary);
        color: var(--text-normal);
        font-size: 1.2em;
    }

    .capture-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }
</style>
