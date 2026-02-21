<script lang="ts">
    import { formatDuration, formatDateRelative } from '../utils.ts';
    import moment from 'moment';
    import { type TaskNode } from '../scheduler.js';
    import { type TodoFlowSettings } from '../main';

    let { 
        tasks,
        focusedIndex,
        now,
        settings,
        logger,
        onTap,
        onPointerStart,
        onPointerMove,
        onPointerEnd,
        onPointerCancel,
        touchBlocking,
        handleTouchBlocking,
        getCardTransform,
        syncGuard,
        executeGestureAction,
        openDurationPicker,
        openQuickAddModal,
        isMobileState
    } = $props();

</script>

<div class="todo-flow-timeline mode-focus" data-view-type="focus">
    {#if tasks.length > 0}
        <!-- FOCUS MODE: Single Card Centerpiece -->
        {@const task = tasks[focusedIndex]}
        <div 
            class="todo-flow-task-card focus-card is-focused" 
            class:is-mobile={isMobileState}
            class:is-temporary={task.id.startsWith('temp-')}
            data-testid="focus-card"
            class:anchored={task.isAnchored}
            class:is-done={task.status === 'done'}
            onclick={(e) => { if (task.id.startsWith('temp-')) return; onTap(e, task, focusedIndex); }}
            onpointerdown={(e) => { if (task.id.startsWith('temp-')) return; onPointerStart(e, task.id); }}
            onpointermove={onPointerMove}
            onpointerup={(e) => { if (task.id.startsWith('temp-')) return; onPointerEnd(e, task); }}
            onpointercancel={onPointerCancel}
            use:touchBlocking={handleTouchBlocking}
            style="touch-action: none; transform: {getCardTransform(task.id)}; pointer-events: {task.id.startsWith('temp-') ? 'none' : 'auto'};"
        >
            <div class="index-display">#{focusedIndex + 1} of {tasks.length}</div>
            <div class="focus-card-inner">
                <div class="focus-time-badge">
                    {formatDateRelative(task.startTime, now)}
                </div>
                
                <h1 class="focus-title">{task.title}</h1>
                
                <div class="focus-metadata">
                    <span class="focus-duration-text">{formatDuration(task.duration)}</span>
                    {#if task.isAnchored}
                        <span class="focus-anchor-status">⚓ Anchored</span>
                    {/if}
                </div>

                <div class="focus-actions">
                    <button class="focus-action-btn complete" data-testid="focus-complete-btn" onclick={syncGuard((e) => { e.stopPropagation(); executeGestureAction('complete', task, focusedIndex); })}>
                        {task.status === 'done' ? 'Undo' : 'Complete'}
                    </button>
                    <button class="focus-action-btn" onclick={syncGuard((e) => { e.stopPropagation(); openDurationPicker(focusedIndex); })}>
                        Adjust Time
                    </button>
                </div>
            </div>
        </div>
        
        <div class="focus-navigation-hints">
            <span class="hint">Swipe L/R to toggle status</span>
            <span class="hint">Tap to drill down</span>
        </div>
    {:else}
        <!-- ZEN MODE: Focus Card -->
        <div class="todo-flow-task-card focus-card zen-card" data-testid="zen-card">
            <div class="zen-icon">✨</div>
            <h1 class="zen-title">All Done</h1>
            <p class="zen-subtitle">Your stack is clear. Take a breath.</p>
            <button class="focus-action-btn complete" onclick={syncGuard(() => openQuickAddModal(-1))}>
                Add a Task
            </button>
        </div>
    {/if}
</div>

<style>
    .todo-flow-timeline {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-width: 600px;
        margin: 0 auto;
        min-height: 300px;
    }

    .todo-flow-timeline.mode-focus {
        justify-content: center;
        align-items: center;
        height: calc(100% - 60px);
    }

    .focus-card {
        width: 90%;
        max-width: 400px;
        background: var(--background-primary-alt);
        border: 2px solid var(--background-modifier-border);
        border-radius: 1.5rem;
        padding: 2.5rem 1.5rem;
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        text-align: center;
        display: flex !important;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1.5rem;
        transition: transform 0.1s ease-out, border-color 0.3s;
        min-height: 250px;
    }

    .zen-card {
        background: linear-gradient(135deg, var(--background-primary-alt), var(--background-secondary));
        border: 2px dashed var(--background-modifier-border);
        cursor: default;
    }

    .zen-title {
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
        background: linear-gradient(to right, var(--text-normal), var(--text-accent));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .zen-subtitle {
        font-size: 1.1rem;
        color: var(--text-muted);
        margin-bottom: 2rem;
    }

    .zen-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.8;
    }

    .focus-card.anchored {
        border-color: var(--interactive-accent);
        background: var(--background-secondary);
    }

    .focus-card-inner {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .index-display {
        font-size: 0.8rem;
        color: var(--text-muted);
        opacity: 0.5;
        font-family: var(--font-monospace);
        margin-bottom: -0.5rem;
    }

    .focus-time-badge {
        font-size: 0.85rem;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
        background: var(--background-secondary);
        padding: 4px 12px;
        border-radius: 12px;
        width: fit-content;
        margin: 0 auto;
    }

    .focus-title {
        font-size: 1.8rem;
        margin: 0.5rem 0;
        color: var(--text-normal);
        line-height: 1.2;
        word-break: break-word;
    }

    .focus-metadata {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        color: var(--text-muted);
    }

    .focus-duration-text {
        font-size: 1.1rem;
        font-family: var(--font-monospace);
    }

    .focus-anchor-status {
        color: var(--interactive-accent);
        font-size: 0.9rem;
        font-weight: 600;
    }

    .focus-actions {
        display: flex;
        gap: 1rem;
        width: 100%;
        margin-top: 1rem;
    }

    .focus-action-btn {
        flex: 1;
        padding: 0.75rem;
        border-radius: 10px;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
        color: var(--text-normal);
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    .focus-action-btn:hover {
        background: var(--background-modifier-border-hover);
        transform: translateY(-2px);
    }

    .focus-action-btn.complete {
        background: var(--interactive-accent);
        color: white;
        border-color: var(--interactive-accent);
    }

    .focus-action-btn.complete:hover {
        background: var(--interactive-accent-hover);
    }

    .focus-navigation-hints {
        margin-top: 2rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        color: var(--text-muted);
        font-size: 0.85rem;
        opacity: 0.6;
    }

    .todo-flow-task-card {
        touch-action: none !important;
        user-select: none;
        -webkit-user-select: none;
        position: relative;
        display: flex;
        padding: 1rem;
        background: var(--background-primary);
        border-radius: 0.5rem;
        border: 2px solid transparent;
        transition: all 0.2s;
        opacity: 0.8;
    }

    .todo-flow-task-card.is-done {
        opacity: 0.5;
    }
</style>
