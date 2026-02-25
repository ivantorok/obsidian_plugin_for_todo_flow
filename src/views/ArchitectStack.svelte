<script lang="ts">
    import { onMount, createEventDispatcher, untrack } from "svelte";
    import { StackController } from "./StackController";
    import { type TaskNode } from "../scheduler.js";
    import moment from "moment";
    import { KeybindingManager } from "../keybindings";
    import { type HistoryManager } from "../history.js";
    import { ReorderToIndexCommand } from "../commands/stack-commands.js";
    import ArchitectStackTemplate from "./ArchitectStackTemplate.svelte";
    import StackFooter from "./StackFooter.svelte";
    import { type TodoFlowSettings } from "../main";
    import { ViewportService } from "../services/ViewportService.js";
    import { StackGestureManager } from "./StackGestureManager.svelte.ts";
    import { StackKeyboardManager } from "./StackKeyboardManager.svelte.ts";
    import { StackInputManager } from "./StackInputManager.svelte.ts";
    import { StackStateManager } from "./StackStateManager.svelte.ts";
    import { StackLifecycleManager } from "./StackLifecycleManager.svelte.ts";
    import { DOUBLE_TAP_WINDOW } from "../gestures.js";

    let {
        navState = $bindable(),
        settings,
        executeGestureAction,
        now = moment(),
        onOpenFile,
        historyManager,
        logger,
        onTaskUpdate,
        onTaskCreate,
        controller,
        onStackChange,
        openQuickAddModal,
        openDurationPicker,
        persistenceService,
        onGoBack,
        onNavigate,
        onExport,
        onFocusChange,
        lockPersistence,
        unlockPersistence,
        debug,
    }: {
        navState: StackUIState;
        settings: TodoFlowSettings;
        executeGestureAction: (action: string, task: TaskNode, index: number) => Promise<void>;
        now: moment.Moment;
        onOpenFile: (path: string) => void;
        historyManager: HistoryManager;
        logger: any;
        onTaskUpdate: (task: TaskNode) => void;
        onTaskCreate: (task: TaskNode) => void;
        controller: StackController;
        onStackChange: (tasks: TaskNode[], index?: number) => void;
        openQuickAddModal?: (currentIndex: number) => void;
        openDurationPicker?: (index: number) => void;
        persistenceService?: any;
        onGoBack?: () => Promise<void>;
        onNavigate?: (id: string, index: number) => void;
        onExport?: (tasks: TaskNode[]) => void;
        onFocusChange?: (index: number) => void;
        lockPersistence?: (path: string, token: string) => void;
        unlockPersistence?: (path: string, token: string) => void;
        debug?: boolean;
    } = $props();

    let containerEl: HTMLElement | null = $state(null);
    let mounted = $state(false);
    let navStateReceived = $state(false);
    let showHelp = $state(false);
    let rerenderTick = $state(0);
    let isSyncing = $state(false);
    let editingIndex = $state(-1);
    let renamingText = $state("");
    let editingStartTimeIndex = $state(-1);
    let activeInteractionToken = $state<string | null>(null);
    let isMobileProp = $state(navState?.isMobile || false);
    let internalNow = $state(now);
    let taskElements: HTMLElement[] = $state([]);
    let renameInputs: HTMLInputElement[] = $state([]);

    const keyManager = $derived(new KeybindingManager(settings.keys));

    const stateManager = new StackStateManager({
        getNavState: () => navState,
        setNavState: (v) => navState = v,
        getController: () => controller,
        getInternalNow: () => internalNow,
        getRerenderTick: () => rerenderTick,
        setRerenderTick: (v) => rerenderTick = v,
        getEditingIndex: () => editingIndex,
        getEditingStartTimeIndex: () => editingStartTimeIndex,
        logger,
        onFocusChange,
        onStackChange,
        getSettings: () => settings
    });

    const lifecycleManager = new StackLifecycleManager({
        onTick: () => { 
            // PREVENT RERENDER DURING RENAME: The lifecycle timer can trigger a re-render 
            // that causes input focus loss, especially in E2E tests.
            if (editingIndex !== -1) return;
            
            internalNow = moment(); 
            stateManager.syncControllerTime(); 
        },
        onResize: () => { 
            const detected = window.innerWidth <= 600 || document.body.classList.contains("is-mobile");
            if (isMobileProp !== detected) isMobileProp = detected;
            rerenderTick++;
        },
        onMount: () => {
            if (navState.tasks.length > 0) navStateReceived = true;
            if (containerEl) containerEl.focus();
        },
        onUnmount: () => {},
        logger
    });

    const gestureState = $state({
        touchStartX: 0,
        touchStartY: 0,
        touchCurrentX: 0,
        touchCurrentY: 0,
        swipingTaskId: null,
        draggingTaskId: null,
        dragTargetIndex: -1,
        draggingStartIndex: -1
    });

    const gestureManager = new StackGestureManager(gestureState, {
        isMobileState: () => isMobileProp,
        getTasks: () => navState.tasks,
        getTaskElements: () => taskElements,
        onGestureAction: executeGestureAction,
        onReorder: async (s, t) => { await historyManager.executeCommand(new ReorderToIndexCommand(controller, s, t)); navState.focusedIndex = t; stateManager.triggerUpdate(); },
        onFocusAction: (idx) => { navState.focusedIndex = idx; if (onFocusChange) onFocusChange(idx); },
        onDrillDown: (id, idx) => onNavigate?.(id, idx),
        getSettings: () => settings,
        onInteractionStart: () => { activeInteractionToken = Math.random().toString(36).substring(7); if (lockPersistence) lockPersistence(navState.rootPath, activeInteractionToken); },
        unlockPersistence: () => { if (unlockPersistence && activeInteractionToken) { unlockPersistence(navState.rootPath, activeInteractionToken); activeInteractionToken = null; } },
        unfreezeController: () => controller?.unfreeze?.(),
        debugLogger: logger
    });

    const inputManager = new StackInputManager({
        getTasks: () => navState.tasks,
        getRenamingText: () => renamingText,
        setRenamingText: (v) => renamingText = v,
        setEditingIndex: (v) => editingIndex = v,
        setEditingStartTimeIndex: (v) => editingStartTimeIndex = v,
        getRenameInputs: () => renameInputs,
        getContainerEl: () => containerEl,
        logger, 
        getController: () => controller, 
        getHistoryManager: () => historyManager,
        update: () => stateManager.triggerUpdate(),
        isSyncing: () => isSyncing
    });

    const keyboardManager = new StackKeyboardManager({
        isSyncing: () => isSyncing,
        getTasks: () => navState.tasks,
        getFocusedIndex: () => navState.focusedIndex,
        setFocusedIndex: (idx) => navState.focusedIndex = idx,
        isMobileState: () => isMobileProp,
        getSettings: () => settings, 
        logger, isMounted: () => mounted,
        isShowHelp: () => showHelp,
        setShowHelp: (v) => showHelp = v,
        getEditingIndex: () => editingIndex,
        getEditingStartTimeIndex: () => editingStartTimeIndex,
        onOpenFile: (p) => onOpenFile(p),
        onGoBack: () => onGoBack?.(),
        onNavigate: (id, idx) => onNavigate?.(id, idx),
        onFocusChange: (idx) => onFocusChange?.(idx),
        openQuickAddModal: (idx) => openQuickAddModal?.(idx),
        onExport: (t) => onExport?.(t),
        onTaskUpdate: async (t) => { await onTaskUpdate(t); },
        historyManager, controller,
        update: () => stateManager.triggerUpdate(),
        startRename: (idx) => inputManager.startRename(idx),
        startEditStartTime: (idx) => inputManager.startEditStartTime(idx),
        clearTapTimer: () => gestureManager.clearTapTimer(),
        persistenceService,
        getKeyManager: () => keyManager
    });

    onMount(() => { mounted = true; lifecycleManager.mount(); return () => lifecycleManager.unmount(); });

    $effect(() => stateManager.syncFocusIndex());
    $effect(() => {
        console.log(`[ArchitectStack] Focus State: ${navState.focusedIndex}, Task Count: ${navState.tasks.length}`);
    });
    $effect(() => stateManager.syncNavState());
    $effect(() => stateManager.syncControllerTime());
    $effect(() => {
        if (editingIndex !== -1) return; // DON'T SCROLL DURING RENAME - causes E2E instability
        if (taskElements[navState.focusedIndex]) {
            ViewportService.scrollIntoView(taskElements[navState.focusedIndex], "smooth", "center");
        }
    });

    function handleTap(e, task, index) {
        if (containerEl) containerEl.focus(); // Explicit Auto-Refocus Governance Axiom
        gestureManager.handleTap(e, task, index, isSyncing, editingIndex !== -1).then(r => {
            if (r?.type === 'single_tap') {
                setTimeout(() => {
                    gestureManager.clearTapTimer();
                    if (navState.focusedIndex === index) onNavigate?.(task.id, index);
                    else { navState.focusedIndex = index; if (onFocusChange) onFocusChange(index); }
                }, DOUBLE_TAP_WINDOW - 50);
            }
        });
    }
    export const handleKeyDown = (e: KeyboardEvent) => keyboardManager.handleKeyDown(e);
    export const getController = () => controller;
    export const getFocusedIndex = () => navState.focusedIndex;
    export const setFocus = (index: number) => { navState.focusedIndex = index; stateManager.triggerUpdate(); };
    export const setTasks = (tasks: TaskNode[]) => { navState.tasks = tasks; stateManager.triggerUpdate(); };
    export const setIsSyncing = (val: boolean) => isSyncing = val;
    export const resolveTempId = (tempId: string, realId: string) => {
        controller.resolveTempId(tempId, realId);
        stateManager.triggerUpdate();
        // Explicit focus restoration to prevent race conditions in E2E tests
        if (containerEl) {
            containerEl.focus();
        }
    };
    export const updateNow = (newNow: moment.Moment) => { internalNow = newNow; stateManager.syncControllerTime(); };
    export const update = () => stateManager.triggerUpdate();

    export const setIsMobile = (val: boolean) => { isMobileProp = val; stateManager.triggerUpdate(); };

    const getCardTransform = (id) => gestureManager.getCardTransform(id);

    const syncGuard = (fn) => (...args) => { 
        if (isSyncing) {
            new (window as any).Notice("Syncing in progress. Please wait...");
            return;
        } 
        return fn?.(...args); 
    };
</script>

<div bind:this={containerEl} class="todo-flow-stack-container" class:is-mobile={isMobileProp} class:is-editing={editingIndex !== -1} tabindex="0" onkeydown={(e) => keyboardManager.handleKeyDown(e)} data-ui-ready="true" data-view-type="architect" data-focused-index={navState.focusedIndex} data-task-count={navState.tasks.length}>
    <div class="todo-flow-timeline">
        <ArchitectStackTemplate
            tasks={navState.tasks} focusedIndex={navState.focusedIndex} now={internalNow}
            {historyManager} {controller} {editingIndex} {editingStartTimeIndex} bind:renamingText
            draggingTaskId={gestureState.draggingTaskId} dragTargetIndex={gestureState.dragTargetIndex}
            draggingStartIndex={gestureState.draggingStartIndex}
            {isMobileProp} onTap={handleTap} onPointerStart={(e, id) => gestureManager.handlePointerStart(e, id)}
            onPointerMove={(e) => gestureManager.handlePointerMove(e)} onPointerEnd={(e, t) => gestureManager.handlePointerEnd(e, t)}
            onPointerCancel={(e) => gestureManager.handlePointerCancel(e)} 
            touchBlocking={(n, h) => gestureManager.touchBlocking(n, h)}
            handleTouchBlocking={(e) => gestureManager.handleTouchBlocking(e)}
            {syncGuard} {getCardTransform}
            startRename={(i) => inputManager.startRename(i)} finishRename={(id, t, s) => inputManager.finishRename(id, t, s)}
            cancelRename={() => inputManager.cancelRename()} startEditStartTime={(i) => inputManager.startEditStartTime(i)}
            finishEditStartTime={(id, t) => inputManager.finishEditStartTime(id, t)}
            selectOnFocus={(n) => { n.focus(); ViewportService.scrollIntoView(n, "smooth", "center"); }}
            update={() => stateManager.triggerUpdate()} {openQuickAddModal} {openDurationPicker}
            bind:renameInputs bind:taskElements
        />
    </div>
    <StackFooter {historyManager} {showHelp} keys={settings.keys} {settings}
        onUndo={() => { historyManager.undo(); stateManager.triggerUpdate(); }}
        onRedo={() => { historyManager.redo(); stateManager.triggerUpdate(); }}
        onQuickAdd={syncGuard(() => openQuickAddModal?.(navState.focusedIndex))}
        onExport={() => onExport?.(navState.tasks)}
    />
</div>

<style>
    @import "../styles/architect-stack.css";
</style>
