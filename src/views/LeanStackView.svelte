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
        onAppendStack: (text: string) => Promise<void>;
    }

    import { LoopManager } from '../services/LoopManager.js';

    let { 
        settings, 
        logger, 
        onTaskUpdate, 
        onAppendInbox,
        onAppendStack
    } = $props<Props>();

    let tasks = $state<TaskNode[]>([]);
    let currentIndex = $state(0);
    let loading = $state(true);
    let captureText = $state("");
    let showCapture = $state(false);
    let showImmersion = $state(false);
    let showVictory = $state(false);

    let currentTask = $derived(tasks[currentIndex]);

    export function setTasks(newTasks: TaskNode[], resetIndex: boolean = true) {
        tasks = newTasks;
        if (resetIndex) {
            currentIndex = 0;
        }
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
        // @ts-ignore
        app.workspace.getLeavesOfType('todo-flow-stack-view').forEach(leaf => {
            // @ts-ignore
            if (leaf.view === this || (leaf.view && (leaf.view as any).view === this)) {
                leaf.detach();
            }
        });
    }

    async function submitImmersionCapture() {
        if (!captureText.trim()) return;
        await onAppendStack(captureText.trim());
        captureText = "";
        showImmersion = false;
        showCapture = false;
        logger.info("[LeanStackView] Immersion Capture submitted");
    }

    function toggleCapture() {
        showCapture = !showCapture;
        showImmersion = showCapture;
    }
</script>

<div class="todo-flow-lean-container">
    {#if loading}
        <div class="loading">Loading Stack...</div>
    {:else if tasks.length === 0}
        <div class="empty-state">No tasks in stack.</div>
    {:else if showVictory}
        <!-- Victory Lap items ... (unchanged) -->
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
    <button class="fab-btn" data-testid="lean-capture-fab" onclick={toggleCapture}>+</button>

    {#if showImmersion}
        <div class="immersion-overlay" data-testid="immersion-overlay">
            <div class="immersion-header">
                <h2>Captured Moment</h2>
                <button class="close-btn" onclick={() => { showImmersion = false; showCapture = false; }}>✕</button>
            </div>
            
            <div class="immersion-context" data-testid="immersion-context">
                <div class="context-label">Current Stack</div>
                <div class="context-scroll">
                    {#each tasks as task}
                        <div class="context-item {task.status === 'done' ? 'is-done' : ''} {task.flow_state === 'parked' ? 'is-parked' : ''}">
                            <span class="dot"></span>
                            <span class="title">{task.title}</span>
                        </div>
                    {/each}
                </div>
            </div>

            <div class="immersion-input-container">
                <textarea 
                    bind:value={captureText} 
                    placeholder="Add to stack..."
                    data-testid="immersion-input"
                    autofocus
                    onkeydown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            submitImmersionCapture();
                        }
                    }}
                ></textarea>
                <div class="input-actions">
                    <button class="mod-cta" data-testid="immersion-submit-btn" onclick={submitImmersionCapture}>Add to Stack</button>
                    <div class="input-hint">Press Enter or click to add</div>
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
        word-break: break-word;
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
        z-index: 10;
        -webkit-tap-highlight-color: transparent;
    }

    /* Immersion Overlay Styles */
    .immersion-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: var(--background-primary);
        display: flex;
        flex-direction: column;
        z-index: 1000;
        padding: 20px;
        padding-top: env(safe-area-inset-top, 20px);
    }

    .immersion-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .immersion-header h2 {
        margin: 0;
        font-size: 1.5em;
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        color: var(--text-muted);
        cursor: pointer;
        padding: 10px;
    }

    .immersion-context {
        flex-grow: 1;
        background-color: var(--background-secondary);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .context-label {
        font-size: 0.8em;
        text-transform: uppercase;
        color: var(--text-muted);
        margin-bottom: 10px;
        letter-spacing: 0.1em;
    }

    .context-scroll {
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .context-item {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 1.1em;
        padding: 4px 0;
    }

    .context-item.is-done {
        opacity: 0.5;
        text-decoration: line-through;
    }

    .context-item.is-parked {
        opacity: 0.7;
        font-style: italic;
    }

    .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: var(--text-muted);
    }

    .immersion-input-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    textarea {
        width: 100%;
        height: 120px;
        padding: 15px;
        border-radius: 8px;
        border: 2px solid var(--interactive-accent);
        background-color: var(--background-primary);
        color: var(--text-normal);
        font-size: 1.2em;
        resize: none;
    }

    .input-hint {
        font-size: 0.9em;
        color: var(--text-muted);
        text-align: center;
    }
</style>
