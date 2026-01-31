<script lang="ts">
    import { onMount, createEventDispatcher, untrack } from 'svelte';
    import { StackController } from './StackController';
    import { type TaskNode, getMinDuration } from '../scheduler.js';
    import { formatDuration, formatDateRelative } from '../utils.ts';
    import moment from 'moment';
    import { KeybindingManager, type KeybindingSettings } from '../keybindings';
    import { type HistoryManager } from '../history.js';
    import {
        MoveTaskCommand,
        ToggleAnchorCommand,
        ScaleDurationCommand,
        ToggleStatusCommand,
        AddTaskCommand,
        DeleteTaskCommand,
        RenameTaskCommand,
        SetStartTimeCommand,
        ArchiveCommand,
        ReorderToIndexCommand,
        AdjustDurationCommand
    } from '../commands/stack-commands.js';
    import HelpModal from './HelpModal.svelte';
    import { type TodoFlowSettings } from '../main';
    import { resolveSwipe, isDoubleTap } from '../gestures.js';
    let { 
        initialTasks, 
        settings, 
        now = moment(), 
        onOpenFile, 
        historyManager, 
        logger,
        onTaskUpdate, 
        onTaskCreate,
        onStackChange,

        openQuickAddModal,
        onNavigate,
        onGoBack,
        onExport,
        debug = false
    } = $props();

    let internalSettings = $state(settings);
    let internalNow = $state(now);

    const keys = $derived(internalSettings.keys);

    export function updateSettings(newSettings: TodoFlowSettings) {
        internalSettings = newSettings;
    }

    export function updateNow(newNow: moment.Moment) {
        internalNow = newNow;
    }

    let controller: StackController;
    let tasks: TaskNode[] = $state([]); // Initialized in onMount/setTasks

    
    $effect(() => {
        if (internalNow) {
            // We read internalNow here to make it a dependency
            const currentNow = internalNow;
            
            untrack(() => {
                if (controller) {
                    controller.updateTime(currentNow);
                    tasks = controller.getTasks();
                    focusedIndex = Math.min(focusedIndex, tasks.length - 1);
                }
            });
        }
    });

    let focusedIndex = $state(0);
    let editingIndex = $state(-1); // -1 means no task is being renamed
    let editingStartTimeIndex = $state(-1); // -1 means no task is being time-edited
    let showHelp = $state(false); // Help Layer State
    
    // We need to instantiate the manager
    let keyManager: KeybindingManager;

    let containerEl: HTMLElement;
    let taskElements: HTMLElement[] = $state([]);

    // Touch State (Per task logic usually handled via closures/loops in Svelte)
    let touchStartX = $state(0);
    let touchStartY = $state(0);
    let touchCurrentX = $state(0);
    let touchCurrentY = $state(0);
    let lastTapTime = $state(0);
    let swipingTaskId = $state<string | null>(null);
    let draggingTaskId = $state<string | null>(null);
    let draggingStartIndex = $state(-1);
    let dragTargetIndex = $state(-1);
    let dragOffsetY = $state(0);
    let startedOnHandle = false;
    let dragLogged = false;
    let lastDragEndTime = 0;

    onMount(() => {
        if (debug) console.log('[TODO_FLOW_TRACE] onMount entry');
        controller = new StackController(initialTasks, internalNow, onTaskUpdate, onTaskCreate);
        tasks = controller.getTasks();
        keyManager = new KeybindingManager(keys);
        
        if (containerEl && !window.navigator.userAgent.includes('HappyDOM')) {
            containerEl.focus();
        }
    });

    $effect(() => {
        if (taskElements[focusedIndex]) {
            // Auto-scroll to keep focused element in view
            taskElements[focusedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    });

    function drillDown(childStack: TaskNode[]) {
        // With Native Navigation, we don't manage stack locally.
        // We find the parent task that owns this stack (implicitly the focused one)
        // and tell the parent/wrapper to navigate to it.
        // HACK: StackController.handleEnter returns subtasks, but not the ID of the parent directly?
        // Wait, handleEnter returns `newStack`. We need the ID to navigate TO.
        // StackController.handleEnter logic:
        // if (task.children) return { action: 'DRILL_DOWN', newStack: task.children }
        // We need the ID of the task we just entered.
        const task = tasks[focusedIndex];
        if (task && onNavigate) {
            onNavigate(task.id, focusedIndex);
        }
    }

    export function update() {
        if (debug) console.debug('[TODO_FLOW_TRACE] update() entry. Current tasks:', tasks.length);
        tasks = controller.getTasks();
        if (onStackChange) onStackChange(tasks);
        if (debug) console.debug('[TODO_FLOW_TRACE] update() complete. New tasks:', tasks.length);
    }

    export function setTasks(newTasks: TaskNode[]) {
        if (debug) console.log('[TODO_FLOW_TRACE] setTasks entry. tasks count:', newTasks.length);
        // Re-initialize controller with new raw tasks
        controller = new StackController(newTasks, internalNow, onTaskUpdate, onTaskCreate);
        // Update local reactive state with the SCHEDULED tasks from controller
        tasks = controller.getTasks();
        if (debug) console.log('[TODO_FLOW_TRACE] setTasks complete. Scheduled count:', tasks.length);
    }

    export function setFocus(index: number) {
        focusedIndex = Math.max(0, Math.min(tasks.length - 1, index));
    }

    export function getFocusedIndex() {
        return focusedIndex;
    }

    export function getController() {
        return controller;
    }


    function startRename(index: number) {
        editingIndex = index;
    }

    let activeRenameId: string | null = null;
    async function finishRename(id: string, newTitle: string) {
        if (activeRenameId === id) {
            if (logger) logger.info(`[StackView.svelte] finishRename BLOCKED - ID ${id} already processing`);
            return;
        }

        const task = tasks.find(t => t.id === id);
        if (!task) return;

        if (logger) logger.info(`[StackView.svelte] finishRename entry - ID: ${id}, New Title: "${newTitle}"`);
        
        try {
            if (newTitle.trim().length > 0 && newTitle !== task.title) {
                activeRenameId = id;
                if (logger) logger.info(`[StackView.svelte] Executing RenameTaskCommand for ID ${id}`);
                
                const index = tasks.findIndex(t => t.id === id);
                if (index === -1) return;

                const cmd = new RenameTaskCommand(controller, index, newTitle);
                await historyManager.executeCommand(cmd);
                update();
            } else {
                if (logger) logger.info(`[StackView.svelte] Rename skipped - Title unchanged or ID mismatch`);
            }
        } finally {
            editingIndex = -1;
            activeRenameId = null;
            // Refocus the container
            setTimeout(() => containerEl?.focus(), 50);
        }
    }
    
    function startEditStartTime(index: number) {
        editingStartTimeIndex = index;
    }

    async function finishEditStartTime(id: string, newTime: string) {
        const index = tasks.findIndex(t => t.id === id);
        if (index === -1) return;
        
        try {
            if (newTime.trim().length > 0) {
                const cmd = new SetStartTimeCommand(controller, index, newTime);
                await historyManager.executeCommand(cmd);
                update();
            }
        } catch (e) {
            new (window as any).Notice(`Invalid time: ${newTime}`);
        } finally {
            editingStartTimeIndex = -1;
            setTimeout(() => containerEl?.focus(), 50);
        }
    }

    // Gesture Handlers
    function handlePointerStart(e: PointerEvent, taskId: string) {
        // Trace logging
        if (logger && internalSettings.debug) {
            logger.info(`[GESTURE] handlePointerStart taskId=${taskId}, target=${(e.target as HTMLElement).className}`);
        }

        e.stopPropagation(); // Avoid Obsidian's default click-and-drag behaviors
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        
        touchStartX = e.clientX;
        touchStartY = e.clientY;
        touchCurrentX = touchStartX;
        touchCurrentY = touchStartY;
        swipingTaskId = taskId;
        
        // Detect if we started on the handle for immediate reorder intent
        const target = e.target as HTMLElement;
        startedOnHandle = target.closest('.drag-handle') !== null;
        dragLogged = false;

        // Reset dragging state
        draggingTaskId = null;
        draggingStartIndex = -1;
        dragTargetIndex = -1;
    }

    function handlePointerMove(e: PointerEvent) {
        if (!swipingTaskId && !draggingTaskId) return;
        
        touchCurrentX = e.clientX;
        touchCurrentY = e.clientY;
        
        const dx = Math.abs(touchCurrentX - touchStartX);
        const dy = Math.abs(touchCurrentY - touchStartY);

        // 1. INTENT LOCKING: Deciding between Swipe vs Drag
        if (!draggingTaskId && (dy > 3 || dx > 3 || startedOnHandle)) {
            // If we started on the handle, or we moved significantly vertically, or just moved at all vertically
            if (startedOnHandle || dy > dx) {
                // LOCK INTO DRAG MODE
                const index = tasks.findIndex(t => t.id === swipingTaskId);
                if (index !== -1 && !tasks[index]!.isAnchored) {
                    draggingTaskId = swipingTaskId;
                    draggingStartIndex = index;
                    dragTargetIndex = index;
                    swipingTaskId = null;
                    if (logger && internalSettings.debug && !dragLogged) {
                        logger.info(`[GESTURE] Intent locked: DRAG (taskId: ${draggingTaskId})`);
                        dragLogged = true;
                    }
                }
            } else if (dx > 20) {
                // Stay in swipe mode
                e.stopPropagation();
            }
        }

        // 2. REORDER LOGIC (Dragging)
        if (draggingTaskId) {
            e.preventDefault(); // Stop scrolling while dragging
            e.stopPropagation();
            
            const y = e.clientY;
            let bestTarget = -1;
            let minDistance = Infinity;
            
            for (let i = 0; i < taskElements.length; i++) {
                const el = taskElements[i];
                if (!el) continue;
                const rect = el.getBoundingClientRect();
                const centerY = rect.top + rect.height / 2;
                const dist = Math.abs(y - centerY);
                
                if (dist < minDistance) {
                    minDistance = dist;
                    bestTarget = i;
                }
            }
            
            if (bestTarget !== -1 && bestTarget !== dragTargetIndex) {
                dragTargetIndex = bestTarget;
            }
        }
    }

    async function handlePointerEnd(e: PointerEvent, task: TaskNode) {
        if (!swipingTaskId && !draggingTaskId) return;
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

        if (draggingTaskId) {
            if (dragTargetIndex !== -1 && dragTargetIndex !== draggingStartIndex) {
                await historyManager.executeCommand(new ReorderToIndexCommand(controller, draggingStartIndex, dragTargetIndex));
                update();
            }
            lastDragEndTime = Date.now();
            draggingTaskId = null;
            draggingStartIndex = -1;
            dragTargetIndex = -1;
            return;
        }

        const deltaX = touchCurrentX - touchStartX;
        const swipe = resolveSwipe(deltaX);
        const index = tasks.findIndex(t => t.id === task.id);

        if (index !== -1) {
            if (swipe === 'right') {
                await executeGestureAction(settings.swipeRightAction, task, index);
            } else if (swipe === 'left') {
                await executeGestureAction(settings.swipeLeftAction, task, index);
            }
        }

        swipingTaskId = null;
        touchStartX = 0;
        touchCurrentX = 0;
    }

    async function executeGestureAction(action: string, task: TaskNode, index: number) {
        if (!action || action === 'none') return;

        if (action === 'complete') {
            await historyManager.executeCommand(new ToggleStatusCommand(controller, index));
            if ((window as any).Notice) new (window as any).Notice(`Task: ${task.title} toggled`);
            update();
        } else if (action === 'archive') {
            await historyManager.executeCommand(new ArchiveCommand(controller, index, async (t) => {
                await onTaskUpdate(t);
            }));
            if ((window as any).Notice) new (window as any).Notice(`Archived: ${task.title}`);
            update();
        } else if (action === 'anchor') {
            await historyManager.executeCommand(new ToggleAnchorCommand(controller, index));
            if ((window as any).Notice) new (window as any).Notice(`${task.isAnchored ? 'Released' : 'Anchored'}: ${task.title}`);
            update();
        }
    }


    function handleTouchBlocking(e: TouchEvent) {
        // High-level blocking for Obsidian's gesture engine
        e.stopPropagation();
        if (swipingTaskId && Math.abs(touchCurrentX - touchStartX) > 10) {
            // Only prevent default if we are swiping horizontally enough
            if (e.cancelable) e.preventDefault();
        }
    }

    async function handleTap(e: MouseEvent, task: TaskNode, index: number) {
        // Prevent click events if we just finished a drag
        const now = Date.now();
        if (now - lastDragEndTime < 300) {
            if (logger && internalSettings.debug) logger.info(`[GESTURE] handleTap BLOCKED by recent drag (${now - lastDragEndTime}ms)`);
            return;
        }
        
        const delta = now - lastTapTime;
        lastTapTime = now; // Update lastTapTime for the next tap

        if (delta < 300) { // Assuming 300ms is the double-tap threshold
            // Double Tap
            if (debug) console.log('[GESTURE] Double Tap Detected');
            await executeGestureAction(settings.doubleTapAction, task, index);
            lastTapTime = 0; // Reset lastTapTime after a double tap
            return;
        }

        // Single Tap logic
        if (focusedIndex === index) {
            // If tapping on an already focused item, treat it as a 'CONFIRM' action
            const navResult = controller.handleEnter(index);
            if (navResult) {
                if (navResult.action === 'DRILL_DOWN') {
                    if (task && onNavigate) {
                        onNavigate(task.id, index);
                    }
                } else if (navResult.action === 'OPEN_FILE' && navResult.path) {
                    if (onNavigate) {
                        onNavigate(navResult.path, index);
                    } else {
                        onOpenFile(navResult.path);
                    }
                }
            }
        } else {
            // If tapping on a new item, just focus it
            focusedIndex = index;
        }
    }

    function getCardTransform(taskId: string) {
        if (swipingTaskId === taskId) {
            const deltaX = touchCurrentX - touchStartX;
            const rotation = deltaX / 20;
            return `translateX(${deltaX}px) rotate(${rotation}deg)`;
        }
        if (draggingTaskId === taskId) {
            const deltaY = touchCurrentY - touchStartY;
            return `translateY(${deltaY}px) scale(1.02) rotate(1deg)`;
        }
        return '';
    }

    function selectOnFocus(node: HTMLInputElement) {
        node.focus();
        node.select();
    }

    export async function handleKeyDown(e: KeyboardEvent) {
        if (logger && internalSettings.debug) logger.info(`[TODO_FLOW_TRACE] handleKeyDown entry: key="${e.key}", shift=${e.shiftKey}, target=${(e.target as HTMLElement).tagName}, active=${document.activeElement?.tagName}`);
        
        // Robust Interference Check:
        const target = e.target as HTMLElement;
        const active = document.activeElement as HTMLElement;

        // 1. If target is an input/textarea
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
            if (logger) logger.info(`[TODO_FLOW_TRACE] handleKeyDown: IGNORED (target is input)`);
            return;
        }
        
        // 2. If target is contenteditable (Obsidian Editor)
        if (target.isContentEditable) {
            if (logger) logger.info(`[TODO_FLOW_TRACE] handleKeyDown: IGNORED (target is contentEditable)`);
            return;
        }

        // 3. Fallback: If active element is contenteditable (sometimes target isn't reliable in bubble)
        if (active && active.isContentEditable) {
            if (logger) logger.info(`[TODO_FLOW_TRACE] handleKeyDown: IGNORED (active is contentEditable)`);
            return;
        }

        // Prevent default scrolling for arrows to avoid moving the page wrapper if Obsidian has one
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }

        const action = keyManager.resolveAction(e);
        if (logger && internalSettings.debug) logger.info(`[TODO_FLOW_TRACE] handleKeyDown: resolved action="${action}"`);
        
        if (!action) return;

        // --- HELP LAYER BLOCKING LOGIC ---
        if (showHelp) {
            // While help is open, ONLY listen for Toggle or Cancel
            if (action === 'TOGGLE_HELP' || action === 'CANCEL') {
                showHelp = false;
                e.stopPropagation();
            }
            // Block all other actions
            return;
        }

        // Normal handling
        if (action === 'TOGGLE_HELP') {
            showHelp = true;
            e.stopPropagation();
            return;
        }

        // --- EDITING BLOCKING LOGIC ---
        if (editingIndex !== -1 || editingStartTimeIndex !== -1) {
            // While editing, we only care about Escape/Enter handled by the input itself
            // but we block global navigation keys
            return;
        }

        // Prevent default browser/Obsidian actions for matched plugin keys
        e.preventDefault();

        // Handle global undo/redo separately
        if (action === 'UNDO') {
            historyManager.undo();
            update();
            return;
        }
        
        if (action === 'REDO') {
            historyManager.redo();
            update();
            return;
        }

        switch (action) {
              case 'RENAME':
                startRename(focusedIndex);
                break;
                
              case 'EDIT_START_TIME':
                startEditStartTime(focusedIndex);
                break;
                
             case 'FORCE_OPEN':
                const forceResult = controller.handleEnter(focusedIndex, true);
                if (forceResult && forceResult.action === 'OPEN_FILE' && forceResult.path) {
                    onOpenFile(forceResult.path);
                }
                break;
                
             case 'GO_BACK':
                if (debug) console.log(`[TODO_FLOW_TRACE] Executing GO_BACK action. onGoBack callback exists: ${!!onGoBack}`);
                if (onGoBack) onGoBack();
                break;

             case 'CONFIRM':
                const navResult = controller.handleEnter(focusedIndex);
                if (navResult) {
                    if (navResult.action === 'DRILL_DOWN') {
                        // Native Navigation: We need to navigate to the task's path
                        const task = tasks[focusedIndex];
                        if (task && onNavigate) {
                            onNavigate(task.id, focusedIndex); 
                        }
                    } else if (navResult.action === 'OPEN_FILE' && navResult.path) {
                        // FIX: "Enter" should try to Drill Down first (in case it's a stack loaded from disk), 
                        // and fallback to Open File if empty.
                        // Pass to onNavigate, which now handles the fallback.
                         if (onNavigate) {
                            onNavigate(navResult.path, focusedIndex);
                        } else {
                            onOpenFile(navResult.path);
                        }
                    }
                }
                break;
            case 'NAV_DOWN':
                focusedIndex = Math.min(tasks.length - 1, focusedIndex + 1);
                break;
            case 'NAV_UP':
                focusedIndex = Math.max(0, focusedIndex - 1);
                break;
            case 'MOVE_DOWN':
                const cmdDown = new MoveTaskCommand(controller, focusedIndex, 'down');
                await historyManager.executeCommand(cmdDown);
                if (cmdDown.resultIndex !== null) {
                    focusedIndex = cmdDown.resultIndex;
                }
                update();
                break;
            case 'MOVE_UP':
                const cmdUp = new MoveTaskCommand(controller, focusedIndex, 'up');
                await historyManager.executeCommand(cmdUp);
                if (cmdUp.resultIndex !== null) {
                    focusedIndex = cmdUp.resultIndex;
                }
                update();
                break;
            case 'ANCHOR':
                const cmdAnchor = new ToggleAnchorCommand(controller, focusedIndex);
                await historyManager.executeCommand(cmdAnchor);
                if (cmdAnchor.resultIndex !== null) {
                    focusedIndex = cmdAnchor.resultIndex;
                }
                update();
                break;
            case 'DURATION_UP':
                const cmdDurUp = new ScaleDurationCommand(controller, focusedIndex, 'up');
                await historyManager.executeCommand(cmdDurUp);
                if (cmdDurUp.resultIndex !== null) {
                    focusedIndex = cmdDurUp.resultIndex;
                }
                update();
                break;
            case 'DURATION_DOWN':
                const cmdDurDown = new ScaleDurationCommand(controller, focusedIndex, 'down');
                await historyManager.executeCommand(cmdDurDown);
                if (cmdDurDown.resultIndex !== null) {
                    focusedIndex = cmdDurDown.resultIndex;
                }
                update();
                break;
            case 'TOGGLE_DONE':
                const cmdStatus = new ToggleStatusCommand(controller, focusedIndex);
                await historyManager.executeCommand(cmdStatus);
                if (cmdStatus.resultIndex !== null) {
                    focusedIndex = cmdStatus.resultIndex;
                }
                update();
                break;
            case 'CREATE_TASK':
                if (debug) console.debug('[TODO_FLOW_TRACE] Action CREATE_TASK triggered (redirecing to QuickAdd)');
                // UNIFIED WORKFLOW: Both 'c' and 'o' now trigger the NLP-enabled Quick Add
                if (openQuickAddModal) {
                    openQuickAddModal(focusedIndex);
                } else {
                     if (debug) console.warn('[TODO_FLOW_TRACE] openQuickAddModal not available in props');
                }
                break;
            case 'QUICK_ADD':
                if (openQuickAddModal) {
                    openQuickAddModal(focusedIndex);
                }
                break;
            case 'DELETE_TASK':
                const taskToDelete = tasks[focusedIndex];
                if (taskToDelete && confirm(`Delete task "${taskToDelete.title}"?`)) {
                    await historyManager.executeCommand(new DeleteTaskCommand(controller, focusedIndex));
                    focusedIndex = Math.max(0, focusedIndex - 1);
                    new (window as any).Notice(`Deleted: ${taskToDelete.title}`);
                    update();
                }
                break;
            case 'ARCHIVE':
                const taskToArchive = tasks[focusedIndex];
                if (taskToArchive) {
                    await historyManager.executeCommand(new ArchiveCommand(controller, focusedIndex, async (t) => {
                        await onTaskUpdate(t);
                    }));
                    focusedIndex = Math.max(0, Math.min(tasks.length - 1, focusedIndex));
                    new (window as any).Notice(`Archived: ${taskToArchive.title}`);
                    update();
                }
                break;
            case 'EXPORT':
                if (onExport) {
                    onExport(tasks);
                }
                break;
        }
    }
</script>


<!-- Make container focusable and attach listener -->
<div 
    class="todo-flow-stack-container" 
    bind:this={containerEl}
    onkeydown={handleKeyDown}
    tabindex="0"
    role="application"
>
    {#if internalNow}
        <div class="todo-flow-stack-header">
            Starting at {internalNow.format('HH:mm')}
        </div>
    {/if}
    <div class="todo-flow-timeline">
        {#each tasks as task, i (task.id)}
            <div 
                bind:this={taskElements[i]}
                class="todo-flow-task-card" 
                class:focused={focusedIndex === i}
                class:anchored={task.isAnchored}
                class:is-done={task.status === 'done'}
                class:dragging={draggingTaskId === task.id}
                class:drop-before={dragTargetIndex === i && i <= draggingStartIndex}
                class:drop-after={dragTargetIndex === i && i > draggingStartIndex}
                onclick={(e) => handleTap(e, task, i)}
                onpointerdown={(e) => handlePointerStart(e, task.id)}
                onpointermove={handlePointerMove}
                onpointerup={(e) => handlePointerEnd(e, task)}
                ontouchstart={handleTouchBlocking}
                ontouchmove={handleTouchBlocking}
                style:transform={getCardTransform(task.id)}
                style:touch-action={draggingTaskId === task.id ? 'none' : 'pan-y'}
            >
                <div 
                    class="drag-handle" 
                    title="Drag to reorder"
                >⠿</div>
                <div class="time-col">
                    {#if editingStartTimeIndex === i}
                        <input 
                            type="text" 
                            class="todo-flow-time-input"
                            value={task.startTime.format('HH:mm')}
                            onkeydown={(e) => {
                                if (e.key === 'Enter') finishEditStartTime(task.id, e.currentTarget.value);
                                if (e.key === 'Escape') editingStartTimeIndex = -1;
                            }}
                            onblur={(e) => finishEditStartTime(task.id, e.currentTarget.value)}
                            use:selectOnFocus
                        />
                    {:else}
                        {formatDateRelative(task.startTime, internalNow)}
                    {/if}
                </div>
                <div class="content-col">
                    {#if editingIndex === i}
                        <input 
                            type="text" 
                            class="todo-flow-title-input"
                            value={task.title}
                            onkeydown={(e) => {
                                if (e.key === 'Enter') finishRename(task.id, e.currentTarget.value);
                                if (e.key === 'Escape') editingIndex = -1;
                            }}
                            onblur={(e) => finishRename(task.id, e.currentTarget.value)}
                            use:selectOnFocus
                        />
                    {:else}
                        <div class="title">{task.title}</div>
                    {/if}
                    <div class="duration">
                        <button 
                            class="duration-btn minus" 
                            onclick={(e) => { e.stopPropagation(); historyManager.executeCommand(new AdjustDurationCommand(controller, i, -15)); update(); }}
                            title="Decrease Duration (-15m)"
                        >−</button>
                        <span class="duration-text">{formatDuration(task.duration)}</span>
                        <button 
                            class="duration-btn plus" 
                            onclick={(e) => { e.stopPropagation(); historyManager.executeCommand(new AdjustDurationCommand(controller, i, 15)); update(); }}
                            title="Increase Duration (+15m)"
                        >+</button>
                        {#if getMinDuration(task) > 0}
                            <span class="constraint-indicator" title="Constrained by subtasks">⚖️</span>
                        {/if}
                    </div>
                </div>
                {#if task.isAnchored}
                    <div class="anchor-badge">⚓</div>
                {/if}
            </div>
        {/each}
    </div>
    <!-- Help Overlay -->
    {#if showHelp}
        <HelpModal {keys} settings={internalSettings} />
    {/if}
</div>

<style>
    .todo-flow-stack-container {
        padding: 2rem;
        background: var(--background-primary);
        height: 100%;
        overflow-y: auto;
        touch-action: pan-y; /* Allow vertical scrolling, but we manage horizontal ourselves */
    }

    .todo-flow-stack-header {
        text-align: center;
        margin-bottom: 2rem;
        font-size: 0.9rem;
        color: var(--text-muted);
        opacity: 0.6;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .todo-flow-timeline {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-width: 600px;
        margin: 0 auto;
    }

    .todo-flow-task-card {
        user-select: none;
        -webkit-user-select: none;
        position: relative;
        display: flex;
        padding: 1rem;
        background: var(--background-secondary);
        border-radius: 0.5rem;
        border: 2px solid transparent;
        gap: 1rem;
        align-items: center;
        transition: all 0.2s;
        opacity: 0.8;
    }

    .todo-flow-task-card.focused {
        border-color: var(--interactive-accent);
        opacity: 1;
        transform: scale(1.02);
    }

    .todo-flow-task-card.anchored {
        background: var(--background-secondary-alt);
    }

    .todo-flow-task-card.dragging {
        opacity: 0.7;
        transform: scale(1.02);
        border: 2px solid var(--interactive-accent);
        background: var(--background-primary-alt);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        cursor: grabbing;
    }

    .todo-flow-task-card.drop-before {
        border-top: 3px solid var(--interactive-accent);
    }

    .todo-flow-task-card.drop-after {
        border-bottom: 3px solid var(--interactive-accent);
    }

    .drag-handle {
        cursor: grab;
        color: var(--text-muted);
        padding: 0 0.5rem;
        opacity: 0.5;
        font-size: 1.2rem;
        user-select: none;
        display: flex;
        align-items: center;
    }

    .drag-handle:hover {
        opacity: 1;
        color: var(--interactive-accent);
    }

    .drag-handle:active {
        cursor: grabbing;
    }

    .time-col {
        font-family: var(--font-monospace);
        font-size: 0.9rem;
        color: var(--text-muted);
        min-width: 60px;
    }

    .content-col {
        flex: 1;
    }

    .title {
        font-weight: 500;
        color: var(--text-normal);
    }

    .duration {
        font-size: 0.8rem;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.2rem;
    }

    .duration-btn {
        background: var(--background-modifier-border);
        border: none;
        border-radius: 4px;
        color: var(--text-normal);
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 1rem;
        line-height: 1;
        padding: 0;
        transition: background 0.1s;
    }

    .duration-btn:hover {
        background: var(--background-modifier-border-hover);
    }
    
    .duration-text {
        font-family: var(--font-monospace);
    }

    .anchor-badge {
        font-size: 1.2rem;
    }
    .constraint-indicator {
        font-size: 0.8rem;
        margin-left: 0.3rem;
        opacity: 0.7;
        cursor: help;
    }

    .is-done {
        opacity: 0.5;
    }
    .is-done .title {
        text-decoration: line-through;
    }

    .todo-flow-title-input {
        width: 100%;
        background: var(--background-modifier-form-field);
        border: 1px solid var(--background-modifier-border);
        color: var(--text-normal);
        font-size: 1rem;
        font-weight: 500;
        padding: 2px 4px;
        border-radius: 4px;
    }

    .todo-flow-time-input {
        width: 60px;
        background: var(--background-modifier-form-field);
        border: 1px solid var(--background-modifier-border);
        color: var(--text-normal);
        font-family: var(--font-monospace);
        font-size: 0.9rem;
        padding: 0 2px;
        border-radius: 4px;
    }
</style>
