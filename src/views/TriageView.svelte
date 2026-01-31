<script lang="ts">
    import { onMount } from 'svelte';
    import { TriageController } from './TriageController';
    import { type TaskNode } from '../scheduler.js';
    import { slide } from 'svelte/transition';
    import { KeybindingManager, type KeybindingSettings } from '../keybindings';
    import { type HistoryManager } from '../history.js';
    import { SwipeCommand } from '../commands/triage-commands.js';
    import Card from '../components/Card.svelte';
    import HelpModal from './HelpModal.svelte';
    import { type TodoFlowSettings } from '../main';

    let { app, tasks: initialTasks, keys, settings, onComplete, historyManager, debug = false, openQuickAddModal, logger } = $props();
    
    let controller: TriageController;
    let tasks = $state<TaskNode[]>([...initialTasks]);
    let currentTask = $state<TaskNode | null>(null);
    let swipeDirection = $state<'left' | 'right' | null>(null);
    let showHelp = $state(false);
    let keyManager: KeybindingManager;

    // Swipe state
    let touchStartX = $state(0);
    let touchCurrentX = $state(0);
    let isSwiping = $state(false);
    const SWIPE_THRESHOLD = 100;

    onMount(() => {
        controller = new TriageController(app, tasks);
        currentTask = controller.getCurrentTask();
        // Fallback for tests or direct usage
        keyManager = new KeybindingManager(keys || { 
            navUp: [], navDown: [], moveUp: [], moveDown: [], anchor: [], 
            durationUp: ['ArrowRight'], durationDown: ['ArrowLeft'], 
            undo: ['u'], confirm: [], cancel: [] 
        });
    });

    function next(direction: 'left' | 'right') {
        swipeDirection = direction;
        setTimeout(async () => {
            await historyManager.executeCommand(new SwipeCommand(controller, direction));
            
            currentTask = controller.getCurrentTask();
            swipeDirection = null;

            if (!currentTask) {
                onComplete(controller.getResults());
            }
        }, 200);
    }

    function handlePointerStart(e: PointerEvent) {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        touchStartX = e.clientX;
        touchCurrentX = touchStartX;
        isSwiping = true;
    }

    function handlePointerMove(e: PointerEvent) {
        if (!isSwiping) return;
        e.stopPropagation();
        touchCurrentX = e.clientX;
        
        // Prevent default browser behavior if swiping
        if (Math.abs(touchCurrentX - touchStartX) > 10) {
            // e.preventDefault(); // Pointer move doesn't usually need preventDefault for scrolling if touch-action is none
        }
    }

    function handlePointerEnd(e: PointerEvent) {
        if (!isSwiping) return;
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        
        const deltaX = touchCurrentX - touchStartX;
        if (deltaX > SWIPE_THRESHOLD) {
            next('right');
        } else if (deltaX < -SWIPE_THRESHOLD) {
            next('left');
        }
        
        isSwiping = false;
        touchStartX = 0;
        touchCurrentX = 0;
    }

    const cardTransform = $derived(() => {
        if (!isSwiping) return '';
        const deltaX = touchCurrentX - touchStartX;
        const rotation = deltaX / 20; // Subtle rotation
        return `translateX(${deltaX}px) rotate(${rotation}deg)`;
    });

    export function addTaskToQueue(task: TaskNode) {
        if (logger) logger.info(`[TriageView.svelte] addTaskToQueue called with: ${task.title}`);
        if (controller) {
            controller.addTask(task);
            // If we were at the end (null task), refresh to show the new one
            if (!currentTask) {
                if (logger) logger.info('[TriageView.svelte] End of queue reached, refreshing currentTask');
                currentTask = controller.getCurrentTask();
                if (logger) logger.info(`[TriageView.svelte] New currentTask: ${currentTask?.title}`);
            }
        } else {
            if (logger) logger.error('[TriageView.svelte] Controller missing in addTaskToQueue!');
        }
    }

    export function handleKeyDown(e: KeyboardEvent) {
        if (debug) console.debug('[TODO_FLOW_TRACE] Triage handleKeyDown:', e.key);
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if ((e.target as HTMLElement).isContentEditable) return;
        
        // Prevent default arrows
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }

        const action = keyManager.resolveAction(e);
        if (!action) return;

        e.preventDefault();

        // Handle global undo/redo
        if (action === 'UNDO') {
            historyManager.undo();
            currentTask = controller.getCurrentTask();
            return;
        }
        
        if (action === 'REDO') {
            historyManager.redo();
            currentTask = controller.getCurrentTask();
            return;
        }

        switch (action) {
            case 'DURATION_DOWN': // Left
            case 'NAV_DOWN':      // j 
                next('left');
                break;
            case 'DURATION_UP':   // Right
            case 'NAV_UP':        // k 
                next('right');
                break;
            case 'CONFIRM':       // Enter
                if (debug) console.log('[TriageView] CONFIRM (Open) triggered');
                controller.openCurrentTask();
                break;
            case 'TOGGLE_HELP':
                showHelp = !showHelp;
                if (debug) console.log(`[TriageView] Help toggled: ${showHelp}`);
                break;
            case 'CANCEL':
                if (showHelp) {
                    showHelp = false;
                }
                break;
            case 'CREATE_TASK':
            case 'QUICK_ADD':
                if (openQuickAddModal) {
                    openQuickAddModal();
                }
                break;
        }
    }
</script>


<div 
    class="todo-flow-triage-container"
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
            <Card title={currentTask.title} variant="triage">
                <div class="todo-flow-triage-hint">
                    ← Not Now | Shortlist →
                </div>
            </Card>
        </div>
    {:else}
        <div class="todo-flow-triage-done">
            <h2>All done!</h2>
            <p>Your shortlist has been updated.</p>
        </div>
    {/if}

    <div class="todo-flow-triage-controls">
        <button onclick={() => next('left')} class="control-btn not-now">← Not Now</button>
        <button onclick={() => { historyManager.undo(); currentTask = controller.getCurrentTask(); }} class="control-btn undo">Undo</button>
        <button onclick={() => next('right')} class="control-btn shortlist">Shortlist →</button>
    </div>

    {#if showHelp}
        <HelpModal keys={keys} settings={settings} />
    {/if}
</div>

<style>
    .todo-flow-triage-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 2rem;
        background: var(--background-primary);
        gap: 2rem;
        touch-action: none; /* Disable default browser/Obsidian gestures here */
    }

    .triage-card-wrapper {
        /* Wrapper handles positioning and animation, Card handles visual box */
        transition: transform 0.2s, opacity 0.2s;
        width: 100%;
        max-width: 400px; /* Match Card variant-triage width */
        display: flex;
        justify-content: center;
    }

    .triage-card-wrapper.left {
        transform: translateX(-100px) rotate(-10deg);
        opacity: 0;
    }

    .triage-card-wrapper.right {
        transform: translateX(100px) rotate(10deg);
        opacity: 0;
    }

    .todo-flow-triage-hint {
        margin-top: 1rem;
        color: var(--text-muted);
        font-size: 0.9rem;
    }

    .todo-flow-triage-controls {
        display: flex;
        gap: 1rem;
    }

    .control-btn {
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        cursor: pointer;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
        color: var(--text-normal);
        transition: background 0.2s;
    }

    .control-btn:hover {
        background: var(--background-modifier-hover);
    }

    .shortlist {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
    }
</style>
