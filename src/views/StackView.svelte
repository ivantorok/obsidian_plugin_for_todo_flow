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
    import { resolveSwipe, isDoubleTap, DOUBLE_TAP_WINDOW } from '../gestures.js';
    import { type StackUIState } from './ViewTypes.js';
    let { 
        navState: initialNavState, // The unified Truth Funnel
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
        onFocusChange,
        lockPersistence,
        unlockPersistence,
        debug = true
    } = $props();

    let navState = $state(initialNavState || {
        tasks: initialTasks || [],
        focusedIndex: 0,
        parentTaskName: null,
        canGoBack: false,
        rootPath: null,
        isMobile: false
    });
    
    let isMobileProp = $state(initialNavState?.isMobile || false);
    let viewMode = $state<'focus' | 'architect'>(initialNavState?.isMobile ? 'focus' : 'architect');
    export function setViewMode(mode: 'focus' | 'architect') {
        viewMode = mode;
    }
    let navigationHistory = $derived(navState?.history || []);
    
    export function setNavState(newState: StackUIState) {
        if (logger && internalSettings.debug) logger.info(`[StackView.svelte] setNavState received: tasks=${newState.tasks.length}, focus=${newState.focusedIndex}`);
        navState = newState;
        
        // CRITICAL: Ensure container remains focused after state updates (especially for empty stacks)
        // Use requestAnimationFrame for immediate next-frame restoration + setTimeout as fallback
        if (typeof window !== 'undefined' && containerEl) {
            const shouldFocus = () => {
                const activeEl = document.activeElement;
                // Focus if: not already focused, not in an input field, or if body/null (focus lost)
                return activeEl !== containerEl && 
                       !(activeEl instanceof HTMLInputElement) &&
                       !(activeEl instanceof HTMLTextAreaElement);
            };
            
            requestAnimationFrame(() => {
                if (shouldFocus()) {
                    if (logger && internalSettings.debug) logger.info(`[StackView.svelte] Restoring focus to container (RAF)`);
                    containerEl.focus();
                }
            });
            
            // Fallback for cases where RAF isn't sufficient
            setTimeout(() => {
                if (shouldFocus()) {
                    if (logger && internalSettings.debug) logger.info(`[StackView.svelte] Restoring focus to container (timeout)`);
                    containerEl.focus();
                }
            }, 100);
        }
    }

    // --- Backward Compatibility / Wrapper API ---
    export function setTasks(newTasks: TaskNode[]) {
        if (controller) {
            controller.setTasks(newTasks);
            tasks = controller.getTasks();
        } else {
            tasks = newTasks;
        }
        
        // Also update navState to keep them in sync if navState exists
        if (navState) {
            navState.tasks = newTasks;
            // Force navState to be "processed" to avoid redundant syncs
            lastProcessedNavState = navState; 
        }
    }

    export function setFocus(index: number) {
        focusedIndex = index;
        if (navState) {
            navState.focusedIndex = index;
            lastProcessedNavState = navState;
        }
    }

    export function setIsMobile(mobile: boolean) {
        if (logger && debug) logger.info(`[StackView.svelte] setIsMobile manual trigger: ${mobile}`);
        isMobileProp = mobile;
        tick++; // Force re-evaluation of derived state
    }

    export function getController() {
        return controller;
    }
    // --------------------------------------------

    let internalParentTaskName = $state(navState?.parentTaskName || null);
    let internalCanGoBack = $state(navState?.canGoBack || false);

    let internalSettings = $state(settings);
    let internalNow = $state(now);
    let tick = $state(0);
    let appMobile = $derived((typeof window !== 'undefined') && (window as any).app?.isMobile === true);
    
    let isMobileState = $derived.by(() => {
        const t = tick; 
        const prop = isMobileProp;
        const width = (typeof window !== 'undefined') ? window.innerWidth : 1000;
        const bodyClass = (typeof window !== 'undefined') && document.body.classList.contains('is-mobile');
        
        return prop || width <= 600 || bodyClass || appMobile;
    });

    let containerEl: HTMLElement | null = $state(null);
    let mounted = $state(false);
    let navStateReceived = $state(false);
    let isReady = $derived(mounted && navStateReceived);
    let lastProcessedNavState = $state(null);
    let showHelp = $state(false); // Help Layer State

    onMount(async () => {
        mounted = true;
        
        // if (debug) console.log('[TODO_FLOW_TRACE] onMount entry'); // Removed debug logging
        
        // window.onclick = (e) => { // Removed debug logging
        //      console.log(`[SVELTE_DEBUG] GLOBAL CLICK: target=${(e.target as HTMLElement)?.tagName}.${(e.target as HTMLElement)?.className}`);
        //      if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[SVELTE_DEBUG] GLOBAL CLICK: target=${(e.target as HTMLElement)?.tagName}.${(e.target as HTMLElement)?.className}`);
        // };

        // Setup periodic refresh
        const interval = setInterval(() => {
            internalNow = moment();
            if (controller) controller.updateNow(internalNow);
        }, 60000);

        if (logger) logger.info(`[StackView.svelte] Mounted with ${tasks.length} tasks`);

        const update = () => {
            tick++;
        };
        update();
        // Resize handler that updates mobile detection and forces re-render
        const handleResize = () => {
            // Explicitly update isMobileProp by checking mobile conditions
            // This ensures reactivity when emulateMobile() adds 'is-mobile' class
            const detectedMobile = window.innerWidth <= 600 || 
                                 document.body.classList.contains('is-mobile') ||
                                 // @ts-ignore
                                 (typeof app !== 'undefined' && app?.isMobile === true);
            
            if (isMobileProp !== detectedMobile) {
                isMobileProp = detectedMobile;
            }
            
            tick++; // Force isMobileState to re-evaluate
            update();
        };
        
        window.addEventListener('resize', handleResize);

        keyManager = new KeybindingManager(keys);
        
        if (containerEl && !window.navigator.userAgent.includes('HappyDOM')) {
            containerEl.focus();
        }

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', handleResize);
            if (focusTimer) clearTimeout(focusTimer);
            if (tapTimer) clearTimeout(tapTimer);
        };
    });


    const keys = $derived(internalSettings.keys);

    export function updateSettings(newSettings: TodoFlowSettings) {
        internalSettings = newSettings;
    }

    export function updateNow(newNow: moment.Moment) {
        internalNow = newNow;
    }

    let controller: StackController;
    let tasks: TaskNode[] = $state([]); 
    let focusedIndex = $state(navState?.focusedIndex || 0);

    // Ensure focusedIndex is always safe
    $effect(() => {
        if (tasks.length > 0) {
            const clamped = Math.max(0, Math.min(tasks.length - 1, focusedIndex));
            if (clamped !== focusedIndex) {
                 if (logger) logger.warn(`[StackView.svelte] Index Out of Bounds Fix: ${focusedIndex} -> ${clamped} (Tasks: ${tasks.length})`);
                 focusedIndex = clamped;
            }
        } else if (focusedIndex !== 0) {
            focusedIndex = 0;
        }
    });

    $effect(() => {
        // Only react to changes in navState object itself
        const currentNavState = navState;
        if (!currentNavState || currentNavState === untrack(() => lastProcessedNavState)) return;

        untrack(() => {
            // Only sync if fundamentally different to avoid race conditions with local pessimistic updates
            // Also BLOCK synchronization while editing to prevent UI flicker/focus loss
            if (editingIndex !== -1 || editingStartTimeIndex !== -1) {
                if (logger && internalSettings.debug) logger.info(`[StackView.svelte] Truth Funnel Sync BLOCKED - Editing in progress`);
                return;
            }

            if (logger && internalSettings.debug) logger.info(`[StackView.svelte] Truth Funnel Sync Triggered: tasks=${currentNavState.tasks.length}, focus=${currentNavState.focusedIndex}`);
            navStateReceived = true;
            lastProcessedNavState = currentNavState;
            
            if (!controller) {
                controller = new StackController(currentNavState.tasks, internalNow, onTaskUpdate, onTaskCreate);
            } else {
                controller.setTasks(currentNavState.tasks);
            }
            
            tasks = controller.getTasks();
            focusedIndex = currentNavState.focusedIndex;
            internalParentTaskName = currentNavState.parentTaskName;
            internalCanGoBack = currentNavState.canGoBack;
            isMobileProp = currentNavState.isMobile;

            // SYNC MODE: If we just received a mobile state for the first time, 
            // and we haven't manually changed the mode, default to 'focus'.
            if (isMobileProp && viewMode === 'architect') {
                if (logger && internalSettings.debug) logger.info(`[StackView.svelte] Defaulting viewMode to 'focus' due to mobile detection`);
                viewMode = 'focus';
            }
        });
    });

    $effect(() => {
        if (internalNow) {
            const currentNow = internalNow;
            untrack(() => {
                if (controller) {
                    controller.updateTime(currentNow);
                    tasks = controller.getTasks();
                }
            });
        }
    });
    let editingIndex = $state(-1); // -1 means no task is being renamed
    let renamingText = $state("");
    let editingStartTimeIndex = $state(-1); // -1 means no task is being time-edited
    
    // We need to instantiate the manager
    let keyManager: KeybindingManager;

    let taskElements: HTMLElement[] = $state([]);
    let renameInputs: HTMLInputElement[] = $state([]);

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
    let lastRenameStartTime = 0;
    let focusTimer: any = null;
    let tapTimer: any = null;


    import { ViewportService } from '../services/ViewportService.js';

    $effect(() => {
        if (taskElements[focusedIndex]) {
            // Use hardened ViewportService to ensure centered focus on mobile
            // For navigation, stick to center, but hardened
            ViewportService.scrollIntoView(taskElements[focusedIndex], 'smooth', isMobileState ? 'center' : 'center');
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
        if (onFocusChange) onFocusChange(focusedIndex);
        if (debug) console.debug('[TODO_FLOW_TRACE] update() complete. New tasks:', tasks.length);
    }
    
    /**
     * Manually refresh mobile detection (useful for E2E tests)
     * @public
     */
    export function refreshMobileDetection() {
        const detectedMobile = (typeof window !== 'undefined') && (
            window.innerWidth <= 600 || 
            document.body.classList.contains('is-mobile') ||
            // @ts-ignore
            (typeof app !== 'undefined' && app?.isMobile === true)
        );
        isMobileProp = detectedMobile;
        tick++;
    }

    export function getFocusedIndex() {
        return focusedIndex;
    }




    export function startRename(index: number) {
        if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[StackView] startRename(${index})`);
        if (logger) logger.info(`[StackView.svelte] startRename called for index ${index}`);
        
        lastRenameStartTime = Date.now();
        
        if (index >= 0 && index < tasks.length) {
            renamingText = tasks[index].title;
        }
        
        editingIndex = index;
        // Focus the input on the next tick
        setTimeout(() => {
            if (renameInputs[index]) {
                renameInputs[index].focus();
                renameInputs[index].select();
            }
        }, 0);
    }

    let activeRenameId: string | null = null;
    async function finishRename(id: string, newTitle: string, source: 'blur' | 'submit' = 'submit') {
        if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[StackView] finishRename(${id}, "${newTitle}", source=${source})`);
        
        if (source === 'blur' && Date.now() - lastRenameStartTime < 500) {
            if (logger) logger.info(`[StackView.svelte] finishRename BLOCKED - Premature blur from ${id}`);
            return;
        }

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
    
    function cancelRename() {
        if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[StackView] cancelRename()`);
        editingIndex = -1;
        if (focusTimer) clearTimeout(focusTimer);
        focusTimer = setTimeout(() => {
            containerEl?.focus();
            focusTimer = null;
        }, 50);
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
        if (isSyncing) {
            // No notice for pointer start to avoid spamming on scrolls
            return;
        }
        if (editingIndex !== -1 || editingStartTimeIndex !== -1) return;
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
        
        if (lockPersistence) lockPersistence();
        if (controller) controller.freeze();
        
        // Detect if we started on the handle for immediate reorder intent
        const target = e.target as HTMLElement;
        startedOnHandle = target.closest('.drag-handle') !== null;
        // console.log(`[GESTURE] startedOnHandle=${startedOnHandle}`);
        dragLogged = false;

        // Reset dragging state
        draggingTaskId = null;
        draggingStartIndex = -1;
        dragTargetIndex = -1;

        // HOLD TO DRAG / LONG PRESS
        if (!startedOnHandle) {
            if (tapTimer) clearTimeout(tapTimer);
            
            const longPressDelay = (settings.longPressAction && settings.longPressAction !== 'none') ? 500 : 350;

            tapTimer = setTimeout(async () => {
                if (swipingTaskId === taskId && !draggingTaskId) {
                    const dx = Math.abs(touchCurrentX - touchStartX);
                    const dy = Math.abs(touchCurrentY - touchStartY);
                    if (dx < 20 && dy < 20) {
                        const index = tasks.findIndex(t => t.id === swipingTaskId);
                        
                        // 1. LONG PRESS ACTION (Overrides Drag)
                        if (settings.longPressAction && settings.longPressAction !== 'none') {
                            if (index !== -1) {
                                if (window.obsidian?.haptics) (window as any).obsidian.haptics.impact('heavy');
                                (window as any)._logs.push(`[GESTURE] Long Press Triggered: ${settings.longPressAction}`);
                                await executeGestureAction(settings.longPressAction, tasks[index]!, index);
                                swipingTaskId = null; // Consume gesture
                            }
                        } else {
                            // No long press action, but we trigger haptic to show drag mode is "primed"
                            if (window.obsidian?.haptics) (window as any).obsidian.haptics.impact('light');
                        }
                    }
                }
            }, longPressDelay);
        }
    }

    function handlePointerMove(e: PointerEvent) {
        if (!(window as any)._logs) (window as any)._logs = [];
        (window as any)._logs.push(`[GESTURE] pointermove clientX=${e.clientX.toFixed(1)} clientY=${e.clientY.toFixed(1)}`);
        if (!swipingTaskId && !draggingTaskId) return;

        // Shadow Obsidian gestures immediately if we have a task intent
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        
        touchCurrentX = e.clientX;
        touchCurrentY = e.clientY;
        
        const dx = Math.abs(touchCurrentX - touchStartX);
        const dy = Math.abs(touchCurrentY - touchStartY);

        if (typeof window !== 'undefined' && !(draggingTaskId)) {
            ((window as any)._logs = (window as any)._logs || []).push(`[GESTURE] move dx=${dx.toFixed(1)} dy=${dy.toFixed(1)} handle=${startedOnHandle}`);
        }
        
        // 1. INTENT LOCKING: Deciding between Swipe vs Drag
        if (!draggingTaskId && (dy > 2 || dx > 2 || startedOnHandle)) {
            // Immediate lock if on handle
            // OR if vertical movement is significantly greater than horizontal
            if (startedOnHandle || dy > (dx * 1.2)) { 
                const index = tasks.findIndex(t => t.id === swipingTaskId);
                if (index !== -1 && !tasks[index]!.isAnchored) {
                    // Start dragging immediately
                    draggingTaskId = swipingTaskId;
                    draggingStartIndex = index;
                    dragTargetIndex = index;
                    swipingTaskId = null;
                    if (tapTimer) clearTimeout(tapTimer); // Cancel long-press timer

                    if (window.obsidian?.haptics) (window as any).obsidian.haptics.impact('medium');
                    if (logger && internalSettings.debug && !dragLogged) {
                        logger.info(`[GESTURE] Intent locked: DRAG (taskId: ${draggingTaskId})`);
                        dragLogged = true;
                    }
                    if (typeof window !== 'undefined') (window as any)._logs.push(`[GESTURE] DRAG START (Immediate): ${draggingTaskId}`);
                }
            } else if (dx > 20) {
                // Stay in swipe mode
                // (Propagation already stopped at top of function)
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
                // Skip the card we are currently dragging to avoid distance-to-self issues
                if (i === draggingStartIndex) continue;

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
            
            if (unlockPersistence) unlockPersistence();
            if (controller) controller.unfreeze();
            
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

        if (unlockPersistence) unlockPersistence();
        if (controller) controller.unfreeze();

        swipingTaskId = null;
        touchStartX = 0;
        touchCurrentX = 0;
    }

    function handlePointerCancel(e: PointerEvent) {
        if (unlockPersistence) unlockPersistence();
        if (controller) controller.unfreeze();
        swipingTaskId = null;
        draggingTaskId = null;
    }

    async function executeGestureAction(action: string, task: TaskNode, index: number) {
        if (debug) console.log(`[StackView DEBUG] executeGestureAction action=${action}, task=${task.title}, index=${index}`);
        if (!action || action === 'none') return;

        let cmd;
        if (action === 'complete') {
            cmd = new ToggleStatusCommand(controller, index);
            await historyManager.executeCommand(cmd);
            if ((window as any).Notice) new (window as any).Notice(`Task: ${task.title} toggled`);
            update(); 
        } else if (action === 'archive') {
            cmd = new ArchiveCommand(controller, index, async (t) => {
                await onTaskUpdate(t);
            });
            await historyManager.executeCommand(cmd);
            if ((window as any).Notice) new (window as any).Notice(`Archived: ${task.title}`);
            update();
        } else if (action === 'anchor') {
            cmd = new ToggleAnchorCommand(controller, index);
            await historyManager.executeCommand(cmd);
            if ((window as any).Notice) new (window as any).Notice(`${task.isAnchored ? 'Released' : 'Anchored'}: ${task.title}`);
            update();
        } else if (action === 'force-open') {
            const navResult = controller.handleEnter(index, true); // forceOpen = true
            if (navResult && navResult.action === 'OPEN_FILE' && navResult.path) {
                if (onOpenFile) onOpenFile(navResult.path);
            }
        }

        // SYNC FOCUS (BUG-020 Fix)
        // Commands populate resultIndex after execution. We must update the reactive focusedIndex
        // to reflect where the task landed (e.g., after an Anchor sort or Toggle jump).
        if (cmd && cmd.resultIndex !== undefined && cmd.resultIndex !== null) {
            focusedIndex = cmd.resultIndex;
        } else if (action === 'archive') {
            // Archive removes the item, so we need to stay within bounds
            focusedIndex = Math.max(0, Math.min(tasks.length - 1, focusedIndex));
        }
    }



    function touchBlocking(node: HTMLElement, handler: (e: TouchEvent) => void) {
        const options = { passive: false, capture: true };
        node.addEventListener('touchstart', handler as EventListener, options);
        node.addEventListener('touchmove', handler as EventListener, options);
        return {
            destroy() {
                node.removeEventListener('touchstart', handler as EventListener, options);
                node.removeEventListener('touchmove', handler as EventListener, options);
            }
        };
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
        if (isSyncing) {
            new (window as any).Notice("Syncing in progress. Please wait...");
            return;
        }
        if (editingIndex !== -1 || editingStartTimeIndex !== -1) return;
        if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[StackView] handleTap: index=${index}, focused=${focusedIndex}, event=${e.type}, x=${e.clientX}, y=${e.clientY}, detail=${e.detail}, button=${e.button}, target=${(e.target as HTMLElement).tagName}`);
        // Prevent click events if we just finished a drag
        const now = Date.now();
        if (now - lastDragEndTime < 300) {
            if (logger && internalSettings.debug) logger.info(`[GESTURE] handleTap BLOCKED by recent drag (${now - lastDragEndTime}ms)`);
            return;
        }
        
        const delta = now - lastTapTime;
        lastTapTime = now; // Update lastTapTime for the next tap

        if (delta < DOUBLE_TAP_WINDOW) { 
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
                            onNavigate(task.id, focusedIndex); 
                        }
                    } else if (navResult.action === 'OPEN_FILE' && navResult.path) {
                        if (onNavigate) {
                            onNavigate(navResult.path, focusedIndex);
                        } else {
                            onNavigate(navResult.path, focusedIndex);
                        }
                    }
                }
            }, DOUBLE_TAP_WINDOW - 50); // Slightly less than window to be safe
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
        // On mobile, use 'start' to ensure it's above the keyboard
        ViewportService.scrollIntoView(node, 'smooth', isMobileState ? 'start' : 'center');
    }

    export async function handleKeyDown(e: KeyboardEvent) {
        if (isSyncing) {
            new (window as any).Notice("Syncing in progress. Please wait...");
            return;
        }
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


        // DIAGNOSTIC: Log keyboard events for debugging
        if (typeof window !== 'undefined') {
            ((window as any)._logs = (window as any)._logs || []).push(`[StackView] handleKeyDown ENTRY: key="${e.key}", mounted=${mounted}, tasks=${tasks.length}`);
        }
        
        // Early return only for non-mounted state
        // CRITICAL: We removed !tasks.length check because GO_BACK must work on empty stacks!
        if (!mounted) return;
        
        const action = keyManager.resolveAction(e);
        if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[StackView] KeyDown: ${e.key} (Shift=${e.shiftKey}) -> Action: ${action} (Focused: ${focusedIndex})`);
        
        // CANCEL PENDING TAPS ON KEYBOARD INTERACTION (Fixes Ghost Click Race)
        if (tapTimer) {
            clearTimeout(tapTimer);
            tapTimer = null;
        }

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
        e.stopImmediatePropagation();

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
                if (logger) logger.info(`[StackView.svelte] Shortcut: RENAME for index ${focusedIndex}`);
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
                if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[StackView] GO_BACK action triggered. onGoBack exists: ${!!onGoBack}`);
                if (debug) console.log(`[TODO_FLOW_TRACE] Executing GO_BACK action. onGoBack callback exists: ${!!onGoBack}`);
                if (onGoBack) onGoBack();
                break;

              case 'CONFIRM':
                const navResult = controller.handleEnter(focusedIndex);
                if (navResult && navResult.action === 'DRILL_DOWN') {
                    const task = tasks[focusedIndex];
                    if (task && onNavigate) {
                        onNavigate(task.id, focusedIndex); 
                    }
                }
                break;
            case 'NAV_DOWN':
                if (tasks.length > 0) {
                    focusedIndex = Math.min(tasks.length - 1, focusedIndex + 1);
                    if (onFocusChange) onFocusChange(focusedIndex);
                }
                break;
            case 'NAV_UP':
                if (tasks.length > 0) {
                    focusedIndex = Math.max(0, focusedIndex - 1);
                    if (onFocusChange) onFocusChange(focusedIndex);
                }
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
    let isSyncing = $state(false);

    export function setIsSyncing(val: boolean) {
        isSyncing = val;
        if (debug) console.log(`[StackView] Sync status updated in UI: ${isSyncing}`);
    }
</script>


<!-- Make container focusable and attach listener -->
<div 
    bind:this={containerEl}
    class="todo-flow-stack-container" 
    class:is-mobile-layout={isMobileState}
    class:is-syncing={isSyncing}
    data-is-mobile={isMobileState}
    data-testid="stack-container"
    data-is-syncing={isSyncing}
    data-ui-ready={isReady}
    data-focused-index={focusedIndex}
    data-task-count={tasks.length}
    data-view-mode={viewMode}
    class:is-dragging={draggingTaskId !== null}
    class:is-editing={editingIndex !== -1 || editingStartTimeIndex !== -1}
    tabindex="0"
    role="application"
    onkeydown={handleKeyDown}
>
    {#if internalNow}
        <div class="todo-flow-stack-header">
            <div class="header-left">
                {#if internalCanGoBack}
                    <button class="back-nav-btn" onclick={syncGuard(onGoBack)} title="Go back to parent">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </button>
                {/if}
                
                <div class="breadcrumb-trail">
                    {#if navigationHistory.length > 0}
                        <span class="breadcrumb-item root" onclick={onGoBack}>...</span>
                        <span class="breadcrumb-separator">/</span>
                    {/if}
                    {#if internalParentTaskName}
                        <span class="breadcrumb-item active" data-testid="header-parent-name">{internalParentTaskName}</span>
                    {/if}
                </div>
            </div>

            <div class="header-right">
                <span class="sync-sentry" class:is-active={isSyncing} data-testid="sync-sentry" data-is-active={isSyncing} title={isSyncing ? "Obsidian Sync Active" : "Obsidian Sync Idle"}>☁️</span>
                <button 
                    class="mode-toggle-btn" 
                    class:is-active={viewMode === 'focus'}
                    onclick={() => viewMode = viewMode === 'focus' ? 'architect' : 'focus'}
                    title={viewMode === 'focus' ? 'Switch to Architect View' : 'Switch to Focus View'}
                >
                    {#if viewMode === 'focus'}
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                    {:else}
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                    {/if}
                </button>
                <span class="header-time">{internalNow.format('HH:mm')}</span>
            </div>
        </div>
    {/if}
    <div class="todo-flow-timeline" class:mode-focus={viewMode === 'focus'}>
        {#if viewMode === 'focus'}
            {#if tasks.length > 0}
                <!-- FOCUS MODE: Single Card Centerpiece -->
                {@const task = tasks[focusedIndex]}
                <div 
                    bind:this={taskElements[focusedIndex]}
                    class="todo-flow-task-card focus-card" 
                    class:is-mobile={isMobileState}
                    data-testid="focus-card"
                    class:anchored={task.isAnchored}
                    class:is-done={task.status === 'done'}
                    onclick={(e) => handleTap(e, task, focusedIndex)}
                    onpointerdown={(e) => handlePointerStart(e, task.id)}
                    onpointermove={handlePointerMove}
                    onpointerup={(e) => handlePointerEnd(e, task)}
                    onpointercancel={handlePointerCancel}
                    use:touchBlocking={handleTouchBlocking}
                    style="touch-action: none; transform: {getCardTransform(task.id)};"
                >
                    <div class="focus-card-inner">
                        <div class="focus-time-badge">
                            {formatDateRelative(task.startTime, internalNow)}
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
        {:else}
            <!-- ARCHITECT MODE: Classic List -->
            {#if tasks.length > 0}
                {#each tasks as task, i (task.id)}
                    <div 
                        bind:this={taskElements[i]}
                        class="todo-flow-task-card" 
                        class:is-mobile={isMobileState}
                        data-testid="task-card-{i}"
                        class:is-focused={focusedIndex === i}
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
                        
                        use:touchBlocking={handleTouchBlocking}
                        style={isMobileState 
                            ? `touch-action: none; transform: ${getCardTransform(task.id)}; flex-wrap: wrap !important; padding: 0.75rem !important; gap: 0.5rem !important;` 
                            : `touch-action: none; transform: ${getCardTransform(task.id)};`}
                    >
                        <div 
                            class="drag-handle" 
                            title="Drag to reorder"
                            style="touch-action: none;"
                        >⠿</div>
                        <div class="time-col" onpointerdown={(e) => e.stopPropagation()} onclick={(e) => { e.stopPropagation(); startEditStartTime(i); }}>
                            {#if editingStartTimeIndex === i}
                                <input 
                                    type="text" 
                                    class="todo-flow-time-input"
                                    value={task.startTime.format('HH:mm')}
                                    onkeydown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.stopPropagation();
                                            finishEditStartTime(task.id, e.currentTarget.value);
                                        }
                                        if (e.key === 'Escape') {
                                            e.stopPropagation();
                                            editingStartTimeIndex = -1;
                                        }
                                    }}
                                    onblur={(e) => finishEditStartTime(task.id, e.currentTarget.value)}
                                     use:selectOnFocus
                                />
                            {:else}
                                <span class="mobile-only-time">{formatDateRelative(task.startTime, internalNow, true)}</span>
                                <span class="desktop-only-time">{formatDateRelative(task.startTime, internalNow)}</span>
                                {#if task.isAnchored}
                                    <svg class="edit-icon" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                {/if}
                            {/if}
                        </div>
                        <div class="content-col" class:mobile-layout={isMobileState}>
                            {#if editingIndex === i}
                                <input
                                    bind:this={renameInputs[i]}
                                    bind:value={renamingText}
                                    type="text"
                                    class="rename-input"
                                    data-testid="rename-input"
                                    onkeydown={(e) => { 
                                        if (e.key === 'Enter') {
                                            e.stopPropagation();
                                            finishRename(task.id, renamingText, 'submit');
                                        }
                                        if (e.key === 'Escape') {
                                            e.stopPropagation();
                                            cancelRename();
                                        }
                                    }}
                                    use:selectOnFocus
                                />
                            {:else}
                                <button 
                                    class="title" 
                                    class:mobile-clamp={isMobileState}
                                    style={isMobileState ? "display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal;" : ""}
                                    data-testid="task-card-title"
                                    onclick={syncGuard(() => startRename(i))} 
                                    title={task.isMissing ? "Note missing" : "Click to rename"} 
                                    role="button" 
                                    tabindex="0"
                                >
                                    {#if task.isMissing}<span class="missing-icon" title="Original note was deleted or moved">⚠️</span> {/if}{task.title}
                                </button>
                            {/if}
                            <div class="metadata" class:mobile-layout={isMobileState}>
                                <div class="duration">
                                    <button 
                                        class="duration-btn minus" 
                                        onclick={syncGuard((e) => { 
                                            e.stopPropagation(); 
                                            historyManager.executeCommand(new ScaleDurationCommand(controller, i, 'down')); 
                                            update(); 
                                        })}
                                        onpointerdown={(e) => e.stopPropagation()}
                                        title="Decrease Duration"
                                    >−</button>
                                    <span 
                                        class="duration-text clickable" 
                                        onclick={(e) => { e.stopPropagation(); openDurationPicker(i); }}
                                        onkeydown={(e) => { if (e.key === 'Enter') openDurationPicker(i); }}
                                        onpointerdown={(e) => e.stopPropagation()}
                                        tabindex="0"
                                        role="button"
                                    >
                                        {formatDuration(task.duration)}
                                    </span>
                                    <button 
                                        class="duration-btn plus" 
                                        onclick={syncGuard((e) => {
                                            e.stopPropagation();
                                            historyManager.executeCommand(new ScaleDurationCommand(controller, i, 'up'));
                                            update();
                                        })}
                                        onpointerdown={(e) => e.stopPropagation()}
                                        title="Increase Duration"
                                    >+</button>
                                    {#if getMinDuration(task) > 0}
                                        <span class="constraint-indicator" title="Constrained by subtasks">⚖️</span>
                                    {/if}
                                    {#if task.isAnchored}
                                        <div class="mobile-anchor-badge">⚓</div>
                                    {/if}
                                </div>
                                <div class="anchor-col">
                                    {#if !task.isMissing}
                                        <button 
                                            class="toggle-anchor-btn" 
                                            class:is-active={task.isAnchored}
                                            onclick={(e) => { e.stopPropagation(); historyManager.executeCommand(new ToggleAnchorCommand(controller, i)); update(); }}
                                            onpointerdown={(e) => e.stopPropagation()}
                                            title={task.isAnchored ? "Release Anchor" : "Pin to Start Time"}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                        </button>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
            {:else}
                <!-- ZEN MODE: Architect List -->
                <div class="zen-list-empty" data-testid="zen-list-empty">
                    <div class="zen-icon">🏔️</div>
                    <h3>Your Architect's Desk is Clear</h3>
                    <p>Add a new task to begin your next flow.</p>
                    <button class="focus-action-btn" style="max-width: 200px;" onclick={syncGuard(() => openQuickAddModal(-1))}>
                        Quick Add
                    </button>
                </div>
            {/if}
        {/if}
    </div>
    <!-- Help Overlay -->
    <div class="footer-controls">
        <button class="icon-button plus-btn" onclick={syncGuard(() => openQuickAddModal(focusedIndex))} title="Add Task">
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
        transition: padding-bottom 0.2s ease;
    }

    .todo-flow-stack-container.is-editing {
        padding-bottom: 40vh; /* Reduced from 50vh to avoid ghost space covering inputs */
    }

    /* Mobile Scrollbar Visibility (UI-001) */
    @media (max-width: 768px) {
        .todo-flow-stack-container::-webkit-scrollbar {
            width: 4px;
            display: block !important;
        }
        .todo-flow-stack-container::-webkit-scrollbar-thumb {
            background-color: var(--text-muted);
            border-radius: 10px;
            border: 1px solid transparent;
            background-clip: content-box;
            opacity: 0.3;
        }
    }

    .todo-flow-stack-container.is-dragging {
        user-select: none !important;
    }

    .todo-flow-stack-container.is-dragging * {
        user-select: none !important;
    }

    .todo-flow-stack-header {
        position: sticky;
        top: -2.05rem; /* Tiny offset to prevent sub-pixel gaps */
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.75rem 1rem;
        margin: -2rem -2rem 2rem -2rem;
        background: var(--background-primary-alt);
        border-bottom: 1px solid var(--background-modifier-border);
        min-height: 48px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .back-nav-btn {
        position: absolute;
        left: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        padding: 4px 10px;
        color: var(--text-normal);
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .back-nav-btn:hover {
        background: var(--background-modifier-border-hover);
        border-color: var(--interactive-accent);
        transform: translateX(-2px);
    }

    .back-nav-btn svg {
        color: var(--text-accent);
    }
    
    .header-parent-name {
        font-weight: 700;
        color: var(--text-normal);
        font-size: 0.95rem;
        margin-right: 0.75rem;
        max-width: 40%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        background: var(--background-modifier-border);
        padding: 2px 8px;
        border-radius: 4px;
        opacity: 0.9;
    }

    .header-time {
        font-size: 0.8rem;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 600;
        opacity: 0.8;
    }

    .breadcrumb-trail {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.9rem;
        color: var(--text-muted);
        margin-left: 2.5rem; /* Space for the back button */
    }

    .breadcrumb-item {
        cursor: pointer;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        transition: color 0.2s;
    }

    .breadcrumb-item:hover {
        color: var(--text-accent);
    }

    .breadcrumb-item.active {
        color: var(--text-normal);
        font-weight: 600;
        cursor: default;
    }

    .breadcrumb-separator {
        opacity: 0.5;
    }

    .sync-sentry {
        font-size: 1.1rem;
        margin-right: 0.75rem;
        opacity: 0.3;
        filter: grayscale(1);
        transition: all 0.3s ease;
    }
 
    .sync-sentry.is-active { 
        filter: grayscale(0); 
        opacity: 1; 
        animation: pulse 2s infinite ease-in-out;
    }

    @keyframes pulse {
        0% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.2); opacity: 1; }
        100% { transform: scale(1); opacity: 0.6; }
    }

    .todo-flow-stack-container.is-syncing {
        cursor: wait !important;
    }

    .todo-flow-stack-container.is-syncing * {
        pointer-events: none !important;
        cursor: wait !important;
        opacity: 0.8;
    }

    .todo-flow-stack-container.is-syncing .todo-flow-stack-header {
        pointer-events: auto !important; /* Allow header interactions if needed, or keep it responsive */
    }

    .todo-flow-stack-container.is-syncing .header-right {
        opacity: 1 !important;
    }

    .mode-toggle-btn {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--text-muted);
        transition: all 0.2s;
        margin-right: 0.75rem;
    }

    .mode-toggle-btn:hover {
        background: var(--background-modifier-border-hover);
        color: var(--text-normal);
    }

    .mode-toggle-btn.is-active {
        background: var(--interactive-accent);
        color: white;
        border-color: var(--interactive-accent);
    }

    .todo-flow-timeline {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-width: 600px;
        margin: 0 auto;
        min-height: 300px; /* Ensure content area doesn't collapse */
    }

    .todo-flow-timeline.mode-focus {
        justify-content: center;
        align-items: center;
        height: calc(100% - 60px); /* Fill space below header */
    }

    /* FOCUS MODE STYLES */
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

    /* ZEN MODE STYLES */
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

    .zen-list-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        text-align: center;
        color: var(--text-muted);
        gap: 1.5rem;
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
        background: var(--background-secondary);
        background: var(--background-primary);
        border-radius: 0.5rem;
        border: 2px solid transparent;
        scroll-margin-top: 5rem; /* Ensure card is not hidden under sticky header when using block: 'start' */
        gap: 1rem;
        align-items: center;
        transition: all 0.2s;
        opacity: 0.8;
    }

    .todo-flow-task-card.is-focused {
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
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .time-col:hover {
        color: var(--text-accent);
    }

    .edit-icon {
        opacity: 0.4;
        transition: opacity 0.2s;
    }

    .time-col:hover .edit-icon {
        opacity: 1;
    }

    .mobile-only-time {
        display: none;
    }

    .content-col {
        flex: 1;
        min-width: 0;
        width: 0; /* aggressive flex reset */
        overflow: hidden;
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

    .mobile-anchor-badge {
        display: none;
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

    /* Mobile Layout Overrides - use ultra-global selectors for robustness in tests */
    :global(body.is-mobile .todo-flow-task-card) {
        flex-wrap: wrap !important;
        padding: 0.75rem !important;
        gap: 0.5rem !important;
    }

    :global(body.is-mobile .todo-flow-task-card .title) {
        flex: 1 1 100% !important;
        max-width: 100% !important;
        display: -webkit-box !important;
        -webkit-box-orient: vertical !important;
        -webkit-line-clamp: 2 !important;
        overflow: hidden !important;
        white-space: normal !important;
        font-weight: 500 !important;
        margin-bottom: 0.25rem !important;
    }

    :global(body.is-mobile .todo-flow-task-card .metadata) {
        flex: 1 1 100% !important;
        width: 100% !important;
        order: 2 !important;
        display: flex !important;
        justify-content: flex-start !important;
        gap: 0.75rem !important;
        font-size: var(--font-ui-smaller) !important;
        opacity: 0.8 !important;
        padding-top: 0.25rem !important;
        border-top: 1px solid var(--background-modifier-border) !important;
    }

    /* Refactored Mobile Styles */
    :global(.todo-flow-task-card.is-mobile) {
        flex-wrap: wrap !important;
        padding: 0.75rem !important;
        gap: 0.5rem !important;
    }
    :global(.title.mobile-clamp) {
        display: -webkit-box !important;
        -webkit-line-clamp: 2 !important;
        -webkit-box-orient: vertical !important;
        white-space: normal !important;
        overflow: hidden !important;
    }
    .todo-flow-task-card.is-mobile .drag-handle {
        padding: 0;
        width: 20px;
    }
    .todo-flow-task-card.is-mobile .time-col {
        flex: 1;
        justify-content: flex-start;
        min-width: unset;
    }
    .todo-flow-task-card.is-mobile .content-col {
        order: 2;
        width: 100%;
        flex: none;
    }

    :global(.is-mobile-layout) .desktop-only-time {
        display: none;
    }

    :global(.is-mobile-layout) .mobile-only-time {
        display: inline;
        font-size: 0.85rem;
        font-weight: 600;
    }

    :global(.is-mobile-layout) .content-col {
        order: 2;
        width: 100%;
        flex: none;
    }
    :global(.is-mobile-layout) .duration {
        margin-top: 0.4rem;
        justify-content: flex-start;
        padding-left: 0;
    }

    :global(.is-mobile) .desktop-only-anchor {
        display: none;
    }

    :global(.is-mobile) .mobile-anchor-badge {
        display: block;
        font-size: 1rem;
        margin-left: auto;
    }

    /* Mobile Layout Refinements */
    .is-mobile-layout {
        background-color: rgba(255, 0, 0, 0.2) !important;
    }

    @media (max-width: 600px) {
        .todo-flow-task-card {
            flex-wrap: wrap;
            padding: 0.75rem;
            gap: 0.5rem;
        }

        .drag-handle {
            padding: 0;
            width: 20px;
        }

        .time-col {
            flex: 1;
            justify-content: flex-start;
            min-width: unset;
        }

        .desktop-only-time {
            display: none;
        }

        .mobile-only-time {
            display: inline;
            font-size: 0.85rem;
            font-weight: 600;
        }

        .content-col {
            order: 2;
            width: 100%;
            flex: none;
        }

        .title {
            white-space: normal;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            font-size: 1rem;
            overflow: hidden;
        }

        .duration {
            margin-top: 0.4rem;
            justify-content: flex-start;
            padding-left: 0;
        }

        .desktop-only-anchor {
            display: none;
        }

        .mobile-anchor-badge {
            display: block;
            font-size: 1rem;
            margin-left: auto;
        }
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
