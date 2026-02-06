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
        openDurationPicker,
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
    let focusTimer: any = null;
    let tapTimer: any = null;

    onMount(() => {
        if (debug) console.log('[TODO_FLOW_TRACE] onMount entry');
        controller = new StackController(initialTasks, internalNow, onTaskUpdate, onTaskCreate);
        tasks = controller.getTasks();
        keyManager = new KeybindingManager(keys);
        
        if (containerEl && !window.navigator.userAgent.includes('HappyDOM')) {
            containerEl.focus();
        }

        return () => {
            if (focusTimer) clearTimeout(focusTimer);
            if (tapTimer) clearTimeout(tapTimer);
        };
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
        if (logger) logger.info(`[StackView] startRename called for index ${index}`);
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
            if (focusTimer) clearTimeout(focusTimer);
            focusTimer = setTimeout(() => {
                containerEl?.focus();
                focusTimer = null;
            }, 50);
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
            if (focusTimer) clearTimeout(focusTimer);
            focusTimer = setTimeout(() => {
                containerEl?.focus();
                focusTimer = null;
            }, 50);
        }
    }

    // Gesture Handlers
    function handlePointerStart(e: PointerEvent, taskId: string) {
        if (!(window as any)._logs) (window as any)._logs = [];
        (window as any)._logs.push(`[GESTURE] pointerdown taskId=${taskId} isPrimary=${e.isPrimary} button=${e.button}`);
        
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
        // console.log(`[GESTURE] startedOnHandle=${startedOnHandle}`);
        dragLogged = false;

        // Reset dragging state
        draggingTaskId = null;
        draggingStartIndex = -1;
        dragTargetIndex = -1;

        // HOLD TO DRAG: If not on handle, allow long-press to start drag
        if (!startedOnHandle) {
            if (tapTimer) clearTimeout(tapTimer);
            
            const longPressDelay = (settings.longPressAction && settings.longPressAction !== 'none') ? 500 : 350;

            tapTimer = setTimeout(async () => {
                if (swipingTaskId === taskId && !draggingTaskId) {
                    const dx = Math.abs(touchCurrentX - touchStartX);
                    const dy = Math.abs(touchCurrentY - touchStartY);
                    if (dx < 20 && dy < 20) {
                        const index = tasks.findIndex(t => t.id === swipingTaskId);
                        
                        // LONG PRESS ACTION (Overrides Drag)
                        if (settings.longPressAction && settings.longPressAction !== 'none') {
                            if (index !== -1) {
                                if (window.obsidian?.haptics) (window as any).obsidian.haptics.impact('heavy');
                                (window as any)._logs.push(`[GESTURE] Long Press Triggered: ${settings.longPressAction}`);
                                await executeGestureAction(settings.longPressAction, tasks[index]!, index);
                                swipingTaskId = null; // Consume gesture
                            }
                            return;
                        }

                        // FALLBACK: HOLD TO DRAG
                         if (index !== -1 && !tasks[index]!.isAnchored) {
                            draggingTaskId = swipingTaskId;
                            draggingStartIndex = index;
                            dragTargetIndex = index;
                            swipingTaskId = null;
                            if (window.obsidian?.haptics) (window as any).obsidian.haptics.impact('medium');
                            (window as any)._logs.push(`[GESTURE] DRAG START: ${taskId}`);
                         }
                    } else {
                        (window as any)._logs.push(`[GESTURE] DRAG/LONG_PRESS BLOCKED: move too large (dx=${dx}, dy=${dy})`);
                    }
                }
            }, longPressDelay);
        }
    }

    function handlePointerMove(e: PointerEvent) {
        if (!(window as any)._logs) (window as any)._logs = [];
        (window as any)._logs.push(`[GESTURE] pointermove clientX=${e.clientX.toFixed(1)} clientY=${e.clientY.toFixed(1)}`);
        if (!swipingTaskId && !draggingTaskId) return;
        
        // BUG-004: Aggressively prevent default to stop browser from stealing the gesture
        if (e.cancelable) e.preventDefault();
        
        touchCurrentX = e.clientX;
        touchCurrentY = e.clientY;
        
        const dx = Math.abs(touchCurrentX - touchStartX);
        const dy = Math.abs(touchCurrentY - touchStartY);

        // 1. INTENT LOCKING: Deciding between Swipe vs Drag
        if (!draggingTaskId && (dy > 3 || dx > 3 || startedOnHandle)) {
            // If we started on the handle, or we moved significantly vertically
            if (startedOnHandle || dy > (dx * 1.5)) { 
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
                if (!(window as any)._logs) (window as any)._logs = [];
                (window as any)._logs.push(`[GESTURE] dragTargetIndex changed: ${dragTargetIndex} -> ${bestTarget}`);
                dragTargetIndex = bestTarget;
                // Add the new log for drag move
                if (!dragLogged) {
                    (window as any)._logs.push(`[GESTURE] DRAG MOVE index=${bestTarget}`);
                    dragLogged = true;
                }
            }
        }
    }

    async function handlePointerEnd(e: PointerEvent, task: TaskNode) {
        // console.log(`[GESTURE] handlePointerEnd task=${task.title}, draggingTaskId=${draggingTaskId}`);
        if (!swipingTaskId && !draggingTaskId) return;
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

        if (draggingTaskId) {
            if (dragTargetIndex !== -1 && dragTargetIndex !== draggingStartIndex && dragTargetIndex < tasks.length) {
                (window as any)._logs.push(`[GESTURE] REORDER TRIGGERED: ${draggingStartIndex} -> ${dragTargetIndex}`);
                const command = new ReorderToIndexCommand(controller, draggingStartIndex, dragTargetIndex);
                await historyManager.executeCommand(command);
                focusedIndex = dragTargetIndex; // Selection follows task
                update();
            } else {
                (window as any)._logs.push(`[GESTURE] REORDER SKIPPED: target=${dragTargetIndex} start=${draggingStartIndex}`);
            }
            draggingTaskId = null;
            draggingStartIndex = -1;
            dragTargetIndex = -1;
            dragLogged = false;
            lastDragEndTime = Date.now();
            
            // IMPORTANT: If we just finished a drag, we don't want to trigger a swipe
            swipingTaskId = null;
            touchStartX = 0;
            touchCurrentX = 0;
            return;
        }

        const deltaX = touchCurrentX - touchStartX;
        const deltaY = touchCurrentY - touchStartY;
        const swipe = resolveSwipe(deltaX, deltaY);
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

    function handlePointerCancel(e: PointerEvent) {
        if (!(window as any)._logs) (window as any)._logs = [];
        (window as any)._logs.push(`[GESTURE] pointercanceltaskId=${swipingTaskId || draggingTaskId}`);
        swipingTaskId = null;
        draggingTaskId = null;
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
        } else if (action === 'force-open') {
            const navResult = controller.handleEnter(index, true); // forceOpen = true
            if (navResult && navResult.action === 'OPEN_FILE' && navResult.path) {
                if (onOpenFile) onOpenFile(navResult.path);
            }
        }
    }


    function handleTouchBlocking(e: TouchEvent) {
        // High-level blocking for Obsidian's gesture engine
        e.stopPropagation();
        const dx = Math.abs(touchCurrentX - touchStartX);
        const dy = Math.abs(touchCurrentY - touchStartY);

        if (draggingTaskId) {
            if (e.cancelable) e.preventDefault();
        } else if (swipingTaskId && (dx > 10 || dy > 10)) {
            // Only prevent default if we have started a clear gesture
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
            
            // Clear any pending single-tap navigate timer
            if (tapTimer) {
                clearTimeout(tapTimer);
                tapTimer = null;
            }

            await executeGestureAction(settings.doubleTapAction, task, index);
            lastTapTime = 0; // Reset lastTapTime after a double tap
            return;
        }

        // Single Tap logic
        if (focusedIndex === index) {
            // If tapping on an already focused item, treat it as a 'CONFIRM' action
            // but DELAY it slightly to allow for a second tap to anchor.
            if (tapTimer) clearTimeout(tapTimer);
            
            tapTimer = setTimeout(() => {
                tapTimer = null;
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
            }, 250); // 250ms window to catch a double-tap
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
                if (logger) logger.info(`[RENAME] Action triggered via keyboard for index ${focusedIndex}`);
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
    class:is-dragging={draggingTaskId !== null}
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
                class:is-missing={task.isMissing}
                class:dragging={draggingTaskId === task.id}
                class:drop-before={dragTargetIndex === i && i !== draggingStartIndex && i <= draggingStartIndex}
                class:drop-after={dragTargetIndex === i && i !== draggingStartIndex && i > draggingStartIndex}
                onclick={(e) => handleTap(e, task, i)}
                onpointerdown={(e) => handlePointerStart(e, task.id)}
                onpointermove={handlePointerMove}
                onpointerup={(e) => handlePointerEnd(e, task)}
                onpointercancel={handlePointerCancel}
                style:transform={getCardTransform(task.id)}
                style:touch-action="none"
            >
                <div 
                    class="drag-handle" 
                    title="Drag to reorder"
                    style="touch-action: none;"
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
                        <div class="title" onclick={() => startRename(i)} title={task.isMissing ? "Note missing" : "Click to rename"} role="button" tabindex="0">{#if task.isMissing}<span class="missing-icon" title="Original note was deleted or moved">⚠️</span> {/if}{task.title}</div>
                    {/if}
                    <div class="duration">
                        <button 
                            class="duration-btn minus" 
                            onpointerdown={(e) => { 
                                e.stopPropagation(); 
                                historyManager.executeCommand(new ScaleDurationCommand(controller, i, 'down')); 
                                update(); 
                            }}
                            title="Decrease Duration"
                        >−</button>
                        <span 
                            class="duration-text clickable" 
                            onclick={(e) => { e.stopPropagation(); openDurationPicker(i); }}
                            onkeydown={(e) => { if (e.key === 'Enter') openDurationPicker(i); }}
                            tabindex="0"
                            role="button"
                        >
                            {formatDuration(task.duration)}
                        </span>
                        <button 
                            class="duration-btn plus" 
                            onpointerdown={(e) => { 
                                e.stopPropagation(); 
                                historyManager.executeCommand(new ScaleDurationCommand(controller, i, 'up')); 
                                update(); 
                            }}
                            title="Increase Duration"
                        >+</button>
                        {#if getMinDuration(task) > 0}
                            <span class="constraint-indicator" title="Constrained by subtasks">⚖️</span>
                        {/if}
                    </div>
                </div>
                {#if task.isAnchored}
                    <div class="anchor-badge">⚓</div>
                {/if}
                {#if task.isMissing}
                    <button 
                        class="remove-orphan-btn" 
                        onclick={(e) => { e.stopPropagation(); historyManager.executeCommand(new DeleteTaskCommand(controller, i)); update(); }}
                        title="Remove missing task from stack"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                {/if}
            </div>
        {/each}
    </div>
    <!-- Help Overlay -->
    <div class="footer-controls">
        <button class="icon-button plus-btn" onclick={() => openQuickAddModal(focusedIndex)} title="Add Task">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <button class="icon-button export-btn" onclick={onExport} title="Export completed tasks">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        {#if showHelp}
            <HelpModal {keys} settings={internalSettings} />
        {/if}
    </div>
</div>

<style>
    .todo-flow-stack-container {
        padding: 2rem;
        background: var(--background-primary);
        outline: none;
        user-select: text;
        height: 100%;
        overflow-y: auto;
        touch-action: pan-y;
    }

    .todo-flow-stack-container.is-dragging {
        user-select: none !important;
    }

    .todo-flow-stack-container.is-dragging * {
        user-select: none !important;
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
        text-align: left;
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        font-size: 1.1rem;
        width: 100%;
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .title:hover {
        color: var(--text-accent);
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
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        color: var(--text-muted);
        border-radius: 4px;
        padding: 0 0.5rem;
        cursor: pointer;
        font-size: 0.8rem;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        height: 24px;
    }

    .duration-btn.small {
        font-size: 0.65rem;
        min-width: 20px;
        height: 20px;
        opacity: 0.7;
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
    .is-done .title, .is-done .title-btn {
        text-decoration: line-through;
    }

    .is-missing {
        opacity: 0.4;
        background: var(--background-primary-alt);
        border: 1px dashed var(--text-error);
    }
    .is-missing .title {
        color: var(--text-error);
        cursor: default;
    }
    .missing-icon {
        margin-right: 0.5rem;
    }

    .remove-orphan-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        opacity: 0.6;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .remove-orphan-btn:hover {
        opacity: 1;
        color: var(--text-error);
        background: var(--background-modifier-error-hover);
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
    .footer-controls {
        position: sticky;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        gap: 1.5rem;
        padding: 1.5rem;
        background: linear-gradient(transparent, var(--background-primary) 60%);
        pointer-events: none;
        z-index: 100;
    }

    .footer-controls .icon-button {
        pointer-events: auto;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--interactive-accent);
        color: white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        border: none;
        cursor: pointer;
        transition: transform 0.2s, background 0.2s;
    }

    .footer-controls .icon-button:hover {
        transform: scale(1.1);
        background: var(--interactive-accent-hover);
    }

    .footer-controls .icon-button.export-btn {
        background: var(--background-modifier-border);
        color: var(--text-muted);
    }

    .footer-controls .icon-button.export-btn:hover {
        background: var(--background-modifier-border-hover);
        color: var(--text-normal);
    }
</style>
