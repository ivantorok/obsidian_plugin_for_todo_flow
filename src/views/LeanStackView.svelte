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
    import moment from 'moment';

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
    let currentTime = $state(moment());
    let undoStack = $state<{ index: number, task: TaskNode }[]>([]);

    // Update current time every minute for the guardian countdown
    $effect(() => {
        const interval = setInterval(() => {
            currentTime = moment();
        }, 60000);
        return () => clearInterval(interval);
    });

    let currentTask = $derived(tasks[currentIndex]);

    let nextAnchoredTask = $derived.by(() => {
        if (tasks.length === 0) return null;
        // Search forward from the task AFTER the current one
        for (let i = currentIndex + 1; i < tasks.length; i++) {
            if (tasks[i].isAnchored && tasks[i].startTime && tasks[i].status !== 'done') {
                return tasks[i];
            }
        }
        return null;
    });

    let guardianCountdown = $derived.by(() => {
        if (!nextAnchoredTask || !nextAnchoredTask.startTime) return null;
        return nextAnchoredTask.startTime.diff(currentTime, 'minutes');
    });

    let guardianUrgency = $derived(guardianCountdown !== null && guardianCountdown < 5);

    export function setTasks(newTasks: TaskNode[], resetIndex: boolean = true) {
        tasks = newTasks;
        if (resetIndex) {
            currentIndex = 0;
            undoStack = [];
        }
        loading = false;
        showVictory = false;
    }

    async function handleDone() {
        if (!currentTask) return;
        
        // Push state to undo stack before change
        undoStack.push({ index: currentIndex, task: { ...currentTask } });
        if (undoStack.length > 5) undoStack.shift();

        const updatedTask = { ...currentTask, status: 'done' as const };
        await onTaskUpdate(updatedTask);
        
        nextTask(false); // don't push again
    }

    async function handlePark() {
        if (!currentTask) return;
        
        undoStack.push({ index: currentIndex, task: { ...currentTask } });
        if (undoStack.length > 5) undoStack.shift();

        const updatedTask = { ...currentTask, flow_state: 'parked' as const };
        await onTaskUpdate(updatedTask);
        
        nextTask(false); // don't push again
    }

    function nextTask(pushToUndo: boolean = true) {
        if (pushToUndo && currentTask) {
            undoStack.push({ index: currentIndex, task: { ...currentTask } });
            if (undoStack.length > 5) undoStack.shift();
        }

        const result = LoopManager.resolveNextIndex(currentIndex, tasks.length, true);
        if (result.showVictory) {
            showVictory = true;
            logger.info("[LeanStackView] Showing Victory Lap card");
        } else {
            currentIndex = result.nextIndex;
        }
    }

    async function handleUndo() {
        const lastAction = undoStack.pop();
        if (!lastAction) return;

        logger.info(`[LeanStackView] Performing Undo to index ${lastAction.index}`);

        const restoredTask = lastAction.task;
        const currentInArray = tasks.find(t => t.id === restoredTask.id);
        
        if (currentInArray && (currentInArray.status !== restoredTask.status || currentInArray.flow_state !== restoredTask.flow_state)) {
            await onTaskUpdate(restoredTask);
            // We need to update the task in our local state as well
            const taskIdx = tasks.findIndex(t => t.id === restoredTask.id);
            if (taskIdx !== -1) {
                tasks[taskIdx] = restoredTask;
            }
        }

        currentIndex = lastAction.index;
        showVictory = false;
    }


    function restartLoop() {
        currentIndex = LoopManager.restartLoop();
        showVictory = false;
        logger.info("[LeanStackView] Loop restarted");
    }

    function closeSession() {
        // @ts-ignore
        app.workspace.getLeavesOfType('todo-flow-lean-stack').forEach(leaf => {
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
    {#if nextAnchoredTask && guardianCountdown !== null}
        <div class="horizon-guardian {guardianUrgency ? 'is-urgent' : ''}" data-testid="horizon-guardian">
            <span class="guardian-label">Horizon:</span>
            <span class="guardian-title" data-testid="guardian-task-title">{nextAnchoredTask.title}</span>
            <span class="guardian-countdown" data-testid="guardian-countdown">{guardianCountdown}m</span>
        </div>
    {/if}

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
                <button class="action-btn restart" data-testid="victory-restart-btn" onclick={restartLoop}>Restart Loop</button>
                <button class="action-btn undo {undoStack.length === 0 ? 'is-disabled' : ''}" data-testid="victory-undo-btn" onclick={handleUndo} disabled={undoStack.length === 0}>Undo Last</button>
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
                <button class="action-btn undo {undoStack.length === 0 ? 'is-disabled' : ''}" data-testid="lean-undo-btn" onclick={handleUndo} disabled={undoStack.length === 0}>UNDO</button>
                <button class="action-btn done" data-testid="lean-done-btn" onclick={handleDone}>DONE</button>
                <button class="action-btn park" data-testid="lean-park-btn" onclick={handlePark}>PARK</button>
                <button class="action-btn next" data-testid="lean-next-btn" onclick={() => nextTask()}>NEXT</button>
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
        padding: 0; /* Remove padding to let guardian be full width */
        position: relative;
        background-color: var(--background-primary);
    }

    .horizon-guardian {
        background-color: var(--background-secondary);
        border-bottom: 1px solid var(--background-modifier-border);
        padding: 10px 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.9em;
        flex-shrink: 0;
    }

    .horizon-guardian.is-urgent {
        background-color: var(--background-modifier-error);
        color: var(--text-on-accent);
    }

    .guardian-label {
        color: var(--text-muted);
        text-transform: uppercase;
        font-size: 0.75em;
        letter-spacing: 0.1em;
        font-weight: 600;
    }

    .horizon-guardian.is-urgent .guardian-label {
        color: inherit;
        opacity: 0.8;
    }

    .guardian-title {
        font-weight: 600;
        flex-grow: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .guardian-countdown {
        font-family: var(--font-monospace);
        padding: 2px 8px;
        background-color: var(--background-primary);
        border-radius: 4px;
        font-size: 0.9em;
        font-weight: bold;
    }

    .horizon-guardian.is-urgent .guardian-countdown {
        background-color: rgba(0,0,0,0.2);
        color: white;
    }

    .loading, .empty-state {
        padding: 20px;
    }

    .task-card {
        margin: 20px;
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
        gap: 15px;
        width: 100%;
        max-width: 450px;
    }

    .action-btn {
        padding: 18px;
        font-size: 1.3em;
        font-weight: bold;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        transition: transform 0.1s, opacity 0.2s;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .action-btn:active {
        transform: scale(0.95);
    }

    .action-btn.is-disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .done {
        background-color: var(--interactive-success);
        color: white;
        grid-column: span 1;
    }

    .park {
        background-color: var(--interactive-accent);
        color: white;
        grid-column: span 1;
    }

    .undo {
        background-color: var(--background-modifier-border);
        color: var(--text-normal);
        grid-column: span 2;
        border: 1px solid var(--background-modifier-border);
    }

    .action-btn.next {
        background-color: var(--background-modifier-border);
        color: var(--text-normal);
        grid-column: span 2;
    }

    .action-btn.restart {
        background-color: var(--interactive-success);
        color: white;
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
