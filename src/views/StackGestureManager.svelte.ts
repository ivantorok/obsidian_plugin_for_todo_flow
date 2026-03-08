import type { TaskNode } from "../scheduler.js";
import { resolveSwipe, DOUBLE_TAP_WINDOW } from "../gestures.js";
import type { GestureManagerConfig, GestureState } from "./GestureTypes.js";

export class StackGestureManager {
    private state: GestureState;
    private config: GestureManagerConfig;

    private longPressTimer: ReturnType<typeof setTimeout> | null = null;
    private tapTimer: ReturnType<typeof setTimeout> | null = null;
    private lastTapTime = 0;
    private DOUBLE_TAP_WINDOW_INTERNAL = DOUBLE_TAP_WINDOW;
    private isPressing = false;
    private _touchMovedSignificant = false;
    private startedOnHandle = false;
    private lastDragEndTime = 0;
    // BUG-029 Hardening: Minimum tap duration + velocity-based scroll detection
    private pointerDownTime = 0;
    private lastMoveTime = 0;
    private lastMoveY = 0;
    private scrollIntentDetected = false;
    private static readonly MIN_TAP_DURATION_MS = 80;
    private static readonly SCROLL_VELOCITY_THRESHOLD = 2; // px/ms
    private static readonly POST_DRAG_COOLDOWN_MS = 500;

    constructor(state: GestureState, config: GestureManagerConfig) {
        this.state = state;
        this.config = config;
    }

    get touchMovedSignificant() {
        return this._touchMovedSignificant;
    }
    set touchMovedSignificant(val: boolean) {
        this._touchMovedSignificant = val;
    }

    getCardTransform(taskId: string): string {
        if (this.state.swipingTaskId === taskId) {
            const deltaX = this.state.touchCurrentX - this.state.touchStartX;
            const rotation = deltaX / 20;
            return `translateX(${deltaX}px) rotate(${rotation}deg)`;
        }
        if (this.state.draggingTaskId === taskId) {
            const deltaY = this.state.touchCurrentY - this.state.touchStartY;
            return `translateY(${deltaY}px) scale(1.02) rotate(1deg)`;
        }
        return "";
    }

    private getResolvedSwipe(deltaX: number, deltaY: number): "left" | "right" | "none" {
        if (!this.config.isMobileState()) return "none";
        return resolveSwipe(deltaX, deltaY);
    }

    handlePointerStart = (e: PointerEvent, taskId: string) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        this.config.onInteractionStart();

        const target = e.target as HTMLElement;
        this.startedOnHandle = !!target.closest(".drag-handle");

        this.isPressing = true;
        this._touchMovedSignificant = false;
        this.scrollIntentDetected = false;
        this.pointerDownTime = Date.now();
        this.lastMoveTime = Date.now();
        this.lastMoveY = e.clientY;
        this.state.touchStartX = e.clientX;
        this.state.touchStartY = e.clientY;
        this.state.touchCurrentX = e.clientX;
        this.state.touchCurrentY = e.clientY;
        this.state.swipingTaskId = taskId;

        const tasks = this.config.getTasks();
        const index = tasks.findIndex((t) => t.id === taskId);
        const task = tasks[index];

        if (!task) return;

        if (this.longPressTimer) clearTimeout(this.longPressTimer);
        const settings = this.config.getSettings();
        if (this.config.isMobileState() && settings?.longPressAction) {
            this.longPressTimer = setTimeout(async () => {
                if (this.isPressing && !this.state.swipingTaskId && !this.state.draggingTaskId && !this._touchMovedSignificant) {
                    if (typeof window !== 'undefined' && (window as any).obsidian?.haptics) {
                        (window as any).obsidian.haptics.impact("heavy");
                    }
                    await this.config.onGestureAction(settings.longPressAction, task, index);
                    this.isPressing = false;
                }
            }, 500);
        }
    }

    handlePointerMove = (e: PointerEvent) => {
        if (!this.isPressing && !this.state.swipingTaskId && !this.state.draggingTaskId) return;

        this.state.touchCurrentX = e.clientX;
        this.state.touchCurrentY = e.clientY;

        const dx = this.state.touchCurrentX - this.state.touchStartX;
        const dy = this.state.touchCurrentY - this.state.touchStartY;

        // BUG-029: More sensitive movement guard on mobile to prevent unintentional taps during scroll/drag initialization
        const threshold = this.config.isMobileState() ? 5 : 10;
        if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
            this._touchMovedSignificant = true;
        }

        // BUG-029 Hardening: Velocity-based scroll detection
        // If vertical velocity exceeds threshold at any point, mark as scroll intent permanently
        if (this.config.isMobileState() && !this.scrollIntentDetected) {
            const now = Date.now();
            const dt = now - this.lastMoveTime;
            if (dt > 0) {
                const velocityY = Math.abs(e.clientY - this.lastMoveY) / dt;
                if (velocityY > StackGestureManager.SCROLL_VELOCITY_THRESHOLD) {
                    this.scrollIntentDetected = true;
                    this._touchMovedSignificant = true;
                }
            }
            this.lastMoveTime = now;
            this.lastMoveY = e.clientY;
        }

        if (!this.state.draggingTaskId) {
            // Reorder Mode Guard: Only allow dragging on mobile if explicitly in reorder mode.
            // This prevents conflict with native scrolling.
            if (this.config.isMobileState() && !this.config.isReorderMode()) {
                return;
            }

            if ((this.startedOnHandle || Math.abs(dy) > Math.abs(dx) * 1.2) && Math.abs(dy) > 5) {
                const tasks = this.config.getTasks();
                const elements = this.config.getTaskElements();

                let bestStart = -1;
                let minStartDist = Infinity;
                for (let i = 0; i < elements.length; i++) {
                    const el = elements[i];
                    if (!el) continue;
                    const rect = el.getBoundingClientRect();
                    const elCenter = rect.top + rect.height / 2;
                    const distance = Math.abs(this.state.touchStartY - elCenter);
                    if (distance < minStartDist) {
                        minStartDist = distance;
                        bestStart = i;
                    }
                }
                if (bestStart !== -1 && tasks[bestStart]) {
                    this.state.draggingTaskId = tasks[bestStart]!.id;
                    this.state.draggingStartIndex = bestStart;
                    this.state.dragTargetIndex = bestStart;
                    this.state.swipingTaskId = null; // Clear swipe intent
                }
            } else if (!this.config.isMobileState() && Math.abs(dx) > 15 && !this.startedOnHandle) {
                this.isPressing = false;
            }
        }

        if (this.state.draggingTaskId) {
            const elements = this.config.getTaskElements();
            let bestTarget = -1;
            let minDistance = Infinity;

            for (let i = 0; i < elements.length; i++) {
                const el = elements[i];
                if (!el) continue;
                const rect = el.getBoundingClientRect();
                const elCenter = rect.top + rect.height / 2;
                const distance = Math.abs(this.state.touchCurrentY - elCenter);

                if (distance < minDistance) {
                    minDistance = distance;
                    bestTarget = i;
                }
            }

            if (bestTarget !== -1 && bestTarget !== this.state.dragTargetIndex) {
                this.state.dragTargetIndex = bestTarget;
            }
        }
    }

    handlePointerEnd = async (e: PointerEvent, task: TaskNode) => {
        if (!this.state.swipingTaskId && !this.state.draggingTaskId) {
            return;
        }

        this.isPressing = false;
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        if (this.state.draggingTaskId) {
            this.config.unfreezeController();

            if (this.state.dragTargetIndex !== -1 && this.state.dragTargetIndex !== this.state.draggingStartIndex && this.state.dragTargetIndex < this.config.getTasks().length) {
                await this.config.onReorder(this.state.draggingStartIndex, this.state.dragTargetIndex);
            } else {
                this.config.unlockPersistence();
            }

            this.lastDragEndTime = Date.now();
            this.state.draggingTaskId = null;
            this.state.draggingStartIndex = -1;
            this.state.dragTargetIndex = -1;
            this.state.swipingTaskId = null;
            this.state.touchStartX = 0;
            this.state.touchCurrentX = 0;
            return;
        }

        this.config.unfreezeController();
        this.config.unlockPersistence();

        const deltaX = this.state.touchCurrentX - this.state.touchStartX;
        const deltaY = this.state.touchCurrentY - this.state.touchStartY;
        const swipe = this.getResolvedSwipe(deltaX, deltaY);

        const tasks = this.config.getTasks();
        const settings = this.config.getSettings();
        const index = tasks.findIndex((t) => t.id === task.id);

        if (index !== -1) {
            if (swipe === "right") {
                await this.config.onGestureAction(this.config.isMobileState() ? "complete" : settings.swipeRightAction, task, index);
            } else if (swipe === "left") {
                await this.config.onGestureAction(this.config.isMobileState() ? "archive" : settings.swipeLeftAction, task, index);
            }
        }

        this.state.swipingTaskId = null;
        this.state.touchStartX = 0;
        this.state.touchCurrentX = 0;
    }

    handlePointerCancel = (e: PointerEvent) => {
        this.config.unfreezeController();
        this.config.unlockPersistence();

        this.isPressing = false;
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        this.state.swipingTaskId = null;
        this.state.draggingTaskId = null;
        this.state.dragTargetIndex = -1;
        this.state.draggingStartIndex = -1;
    }

    handleTouchBlocking(e: TouchEvent) {
        e.stopPropagation();

        const dx = Math.abs(this.state.touchCurrentX - this.state.touchStartX);
        const dy = Math.abs(this.state.touchCurrentY - this.state.touchStartY);

        const threshold = this.config.isMobileState() ? 5 : 10;
        if (dx > threshold || dy > threshold) {
            this._touchMovedSignificant = true;
        }

        if (this.state.draggingTaskId) {
            if (e.cancelable) e.preventDefault();
        } else if (this.state.swipingTaskId && (dx > threshold || dy > threshold)) {
            if (e.cancelable) e.preventDefault();
        }
    }

    touchBlocking(node: HTMLElement, handler: (e: TouchEvent) => void) {
        const options = { passive: false, capture: true };
        node.addEventListener("touchstart", handler as EventListener, options);
        node.addEventListener("touchmove", handler as EventListener, options);
        return {
            destroy() {
                node.removeEventListener("touchstart", handler as EventListener, options);
                node.removeEventListener("touchmove", handler as EventListener, options);
            },
        };
    }

    handleTap = async (e: MouseEvent, task: TaskNode, index: number, isSyncing: boolean, editingActive: boolean) => {
        if (isSyncing) {
            new (window as any).Notice("Syncing in progress. Please wait...");
            return;
        }
        if (editingActive) return;

        // BUG-029: Explicitly block tap if we are in the middle of a gesture
        if (this.state.draggingTaskId || this.state.swipingTaskId) {
            return;
        }

        if (this._touchMovedSignificant) {
            this._touchMovedSignificant = false;
            return;
        }

        const now = Date.now();
        // BUG-029 Hardening: Wider post-drag cooldown (500ms) for mobile animation frames
        if (now - this.lastDragEndTime < StackGestureManager.POST_DRAG_COOLDOWN_MS) {
            return;
        }

        // BUG-029 Hardening: Reject taps shorter than MIN_TAP_DURATION_MS (accidental brush touches)
        const tapDuration = now - this.pointerDownTime;
        if (this.config.isMobileState() && tapDuration < StackGestureManager.MIN_TAP_DURATION_MS) {
            return;
        }

        // BUG-029 Hardening: Reject taps if scroll intent was detected during this interaction
        if (this.scrollIntentDetected) {
            this.scrollIntentDetected = false;
            return;
        }

        const delta = now - this.lastTapTime;
        this.lastTapTime = now;

        if (delta < this.DOUBLE_TAP_WINDOW_INTERNAL) {
            if (this.tapTimer) {
                clearTimeout(this.tapTimer);
                this.tapTimer = null;
            }

            const settings = this.config.getSettings();
            // BUG-029: On mobile, double-tap is now 'open' (drill down) because we have a dedicated button for anchoring.
            // This makes the 'biggest problem' (unintentional drill-down) much harder to trigger.
            const action = this.config.isMobileState() ? "open" : settings.doubleTapAction;
            await this.config.onGestureAction(action, task, index);
            this.lastTapTime = 0;
            return;
        }

        return { type: 'single_tap', task, index, tapTimerPtr: this.tapTimer };
    }

    setTapTimer(timer: any) {
        this.tapTimer = timer;
    }

    clearTapTimer() {
        if (this.tapTimer) {
            clearTimeout(this.tapTimer);
            this.tapTimer = null;
        }
    }
}
