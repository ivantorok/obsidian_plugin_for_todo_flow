<script lang="ts">
    import { onMount } from "svelte";
    import { TriageController } from "./TriageController";
    import { type TaskNode } from "../scheduler.js";
    import { slide } from "svelte/transition";
    import { KeybindingManager, type KeybindingSettings } from "../keybindings";
    import { type HistoryManager } from "../history.js";
    import { SwipeCommand } from "../commands/triage-commands.js";
    import Card from "../components/Card.svelte";
    import HelpModal from "./HelpModal.svelte";
    import { type TodoFlowSettings } from "../main";

    let {
        app,
        tasks: initialTasks,
        keys,
        settings,
        onComplete,
        historyManager,
        debug = false,
        openQuickAddModal,
        logger,
        contentEl,
        checkForConflict,
    } = $props();
    const controller = $derived.by(
        () => new TriageController(app, initialTasks, logger),
    );
    let currentTask = $state(controller.getCurrentTask());
    let swipeDirection = $state<"left" | "right" | null>(null);
    let showHelp = $state(false);
    let keyManager: KeybindingManager;
    let isConflictState = $state(false); // New state for Conflict Card

    // Swipe state
    let touchStartX = $state(0);
    let touchCurrentX = $state(0);
    let isSwiping = $state(false);
    const SWIPE_THRESHOLD = 100;

    onMount(() => {
        // Fallback for tests or direct usage
        keyManager = new KeybindingManager(
            keys || {
                navUp: [],
                navDown: [],
                moveUp: [],
                moveDown: [],
                anchor: [],
                durationUp: ["ArrowRight"],
                durationDown: ["ArrowLeft"],
                undo: ["u"],
                confirm: [],
                cancel: [],
            },
        );

        return () => {
            if (triageTimer) clearTimeout(triageTimer);
        };
    });

    let triageTimer: any = null;
    function next(direction: "left" | "right") {
        swipeDirection = direction;
        if (triageTimer) clearTimeout(triageTimer);

        // Immediate UI feedback
        triageTimer = setTimeout(async () => {
            // If in Conflict State, swipe determines strategy
            if (isConflictState) {
                const strategy = direction === "right" ? "merge" : "overwrite";
                onComplete({ ...controller.getResults(), strategy });
                swipeDirection = null;
                triageTimer = null;
                return;
            }

            await historyManager.executeCommand(
                new SwipeCommand(controller, direction),
            );

            currentTask = controller.getCurrentTask();
            swipeDirection = null;
            triageTimer = null;

            if (!currentTask) {
                // Queue finished. Check for conflict BEFORE completing.
                if (checkForConflict && (await checkForConflict())) {
                    isConflictState = true;
                } else {
                    onComplete(controller.getResults());
                }
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
            next("right");
        } else if (deltaX < -SWIPE_THRESHOLD) {
            next("left");
        }

        isSwiping = false;
        touchStartX = 0;
        touchCurrentX = 0;
    }

    function handleTouchBlocking(e: TouchEvent) {
        // High-level blocking for Obsidian's gesture engine
        e.stopPropagation();
        if (isSwiping && Math.abs(touchCurrentX - touchStartX) > 10) {
            if (e.cancelable) e.preventDefault();
        }
    }

    const cardTransform = $derived(() => {
        if (!isSwiping) return "";
        const deltaX = touchCurrentX - touchStartX;
        const rotation = deltaX / 20; // Subtle rotation
        return `translateX(${deltaX}px) rotate(${rotation}deg)`;
    });

    export function addTaskToQueue(task: TaskNode, persist: boolean = false) {
        if (logger)
            logger.info(
                `[TriageView.svelte] addTaskToQueue called with: ${task.title}, persist: ${persist}`,
            );
        if (controller) {
            controller.addTask(task, persist);
            // If we were at the end (null task), refresh to show the new one
            if (!currentTask) {
                if (logger)
                    logger.info(
                        "[TriageView.svelte] End of queue reached, refreshing currentTask",
                    );
                currentTask = controller.getCurrentTask();
                if (logger)
                    logger.info(
                        `[TriageView.svelte] New currentTask: ${currentTask?.title}`,
                    );
            }
        } else {
            if (logger)
                logger.error(
                    "[TriageView.svelte] Controller missing in addTaskToQueue!",
                );
        }
    }

    export function handleKeyDown(e: KeyboardEvent) {
        if (debug)
            console.debug("[TODO_FLOW_TRACE] Triage handleKeyDown:", e.key);
        if (
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement
        )
            return;
        if ((e.target as HTMLElement).isContentEditable) return;

        // Prevent default arrows
        if (
            ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(
                e.key,
            )
        ) {
            e.preventDefault();
        }

        const action = keyManager.resolveAction(e);
        if (!action) return;

        e.preventDefault();

        // Handle global undo/redo
        if (action === "UNDO") {
            historyManager.undo();
            currentTask = controller.getCurrentTask();
            return;
        }

        if (action === "REDO") {
            historyManager.redo();
            currentTask = controller.getCurrentTask();
            return;
        }

        const isTemp = currentTask?.id?.startsWith("temp-");

        switch (action) {
            case "DURATION_DOWN": // Left
            case "NAV_DOWN": // j
                if (!isTemp) next("left");
                break;
            case "DURATION_UP": // Right
            case "NAV_UP": // k
                if (!isTemp) next("right");
                break;
            case "CONFIRM": // Enter
                if (debug) console.log("[TriageView] CONFIRM (Open) triggered");
                if (!isTemp) controller.openCurrentTask();
                break;
            case "TOGGLE_HELP":
                showHelp = !showHelp;
                if (debug)
                    console.log(`[TriageView] Help toggled: ${showHelp}`);
                break;
            case "CANCEL":
                if (showHelp) {
                    showHelp = false;
                }
                break;
            case "CREATE_TASK":
            case "QUICK_ADD":
                if (openQuickAddModal) {
                    openQuickAddModal();
                }
                break;
        }
    }
    function handleBtnClick(
        e: MouseEvent,
        direction?: "left" | "right",
        customAction?: () => void,
    ) {
        if (currentTask?.id?.startsWith("temp-")) return;
        const btn = e.currentTarget as HTMLElement;

        if (direction) {
            next(direction);
        } else if (customAction) {
            customAction();
        }

        // Use a small timeout to ensure we clear focus AFTER the browser's
        // default click/pointer handling has finished.
        setTimeout(() => {
            btn.blur();

            // Restore focus to the contentEl (the view container from Obsidian)
            // to maintain "Focus Sovereignty". Note: While buttons are now static
            // visually (BUG-015), we still return focus to the container to
            // ensure keyboard navigation (j/k) continues to work immediately.
            if (contentEl) {
                contentEl.focus();
            } else {
                // Fallback to container if contentEl prop not provided (tests)
                const container = btn.closest(
                    ".todo-flow-triage-container",
                ) as HTMLElement;
                if (container) {
                    container.focus();
                }
            }
        }, 50);
    }
</script>

<div class="todo-flow-triage-container" tabindex="-1">
    {#if currentTask}
        <div
            class="triage-card-wrapper {swipeDirection}"
            class:is-temporary={currentTask?.id?.startsWith("temp-")}
            transition:slide
            onpointerdown={(e) => {
                if (currentTask?.id?.startsWith("temp-")) return;
                handlePointerStart(e);
            }}
            onpointermove={handlePointerMove}
            onpointerup={(e) => {
                if (currentTask?.id?.startsWith("temp-")) return;
                handlePointerEnd(e, currentTask);
            }}
            ontouchstart={handleTouchBlocking}
            ontouchmove={handleTouchBlocking}
        >
            <Card title={currentTask?.title} variant="triage">
                <div class="todo-flow-triage-hint">
                    {currentTask?.id?.startsWith("temp-")
                        ? "Creating task..."
                        : "← Not Now | Shortlist →"}
                </div>
            </Card>
        </div>
    {:else if isConflictState}
        <div
            class="triage-card-wrapper {swipeDirection}"
            transition:slide
            onpointerdown={handlePointerStart}
            onpointermove={handlePointerMove}
            onpointerup={handlePointerEnd}
            ontouchstart={handleTouchBlocking}
            ontouchmove={handleTouchBlocking}
            style:transform={cardTransform()}
            style:touch-action="none"
        >
            <Card title="Existing Stack Detected" variant="triage">
                <div class="todo-flow-triage-conflict-message">
                    <p>You have an active Daily Stack.</p>
                </div>
                <div class="todo-flow-triage-hint conflict">
                    ← Overwrite (Fresh) | Merge (Append) →
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
        <button
            onclick={(e) => handleBtnClick(e, "left")}
            class="control-btn not-now {isConflictState
                ? 'conflict-reject'
                : ''}"
            disabled={currentTask?.id?.startsWith("temp-")}
        >
            {isConflictState ? "← Overwrite" : "← Not Now"}
        </button>
        {#if !isConflictState}
            <button
                onclick={(e) =>
                    handleBtnClick(e, undefined, () => {
                        historyManager.undo();
                        currentTask = controller.getCurrentTask();
                    })}
                class="control-btn undo"
                disabled={currentTask?.id?.startsWith("temp-")}
            >
                Undo
            </button>
        {/if}
        <button
            onclick={(e) => handleBtnClick(e, "right")}
            class="control-btn shortlist {isConflictState
                ? 'conflict-resolve'
                : ''}"
            disabled={currentTask?.id?.startsWith("temp-")}
        >
            {isConflictState ? "Merge →" : "Shortlist →"}
        </button>
    </div>

    <!-- Mobile FAB for Quick Add (FEAT-001) -->
    <div class="footer-controls">
        <button
            class="icon-button plus-btn"
            onclick={() => openQuickAddModal()}
            title="Add Task"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><line x1="12" y1="5" x2="12" y2="19"></line><line
                    x1="5"
                    y1="12"
                    x2="19"
                    y2="12"
                ></line></svg
            >
        </button>
    </div>

    {#if showHelp}
        <HelpModal {keys} {settings} />
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
        transition:
            transform 0.2s,
            opacity 0.2s;
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
        transition: none;
        /* Disable all interaction colors for Android stability (BUG-015) */
        -webkit-tap-highlight-color: transparent;
    }

    .control-btn:hover,
    .control-btn:active,
    .control-btn:focus {
        background: var(--background-secondary);
        outline: none;
    }

    .shortlist {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
    }

    .shortlist:hover,
    .shortlist:active {
        background: var(--interactive-accent);
    }

    /* Conflict Mode Styles */
    .todo-flow-triage-conflict-message {
        padding: 1rem 0;
        text-align: center;
        opacity: 0.8;
    }

    .todo-flow-triage-hint.conflict {
        color: var(--text-warning);
        font-weight: bold;
    }

    .conflict-reject {
        background: var(--background-modifier-error);
        color: var(--text-on-accent);
        border-color: var(--background-modifier-error);
    }

    .conflict-accept {
        background: var(--interactive-success);
        color: var(--text-on-accent);
        border-color: var(--interactive-success);
    }

    /* Consistent Mobile Controls Pattern */
    .footer-controls {
        position: absolute;
        bottom: calc(env(safe-area-inset-bottom, 0px) + 60px);
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
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        border: none;
        cursor: pointer;
        transition: none;
        -webkit-tap-highlight-color: transparent;
    }

    .footer-controls .icon-button:hover,
    .footer-controls .icon-button:active {
        background: var(--interactive-accent);
        transform: none;
    }
    .triage-card-wrapper.is-temporary {
        opacity: 0.5;
        cursor: wait !important;
        pointer-events: none !important;
    }
</style>
