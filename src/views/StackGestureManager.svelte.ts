import type { TaskNode } from "../scheduler.js";
import { resolveSwipe } from "../gestures.js";
import type { GestureManagerConfig } from "./GestureTypes.js";

export class StackGestureManager {
    touchStartX = $state(0);
    touchStartY = $state(0);
    touchCurrentX = $state(0);
    touchCurrentY = $state(0);

    swipingTaskId = $state<string | null>(null);
    draggingTaskId = $state<string | null>(null);
    dragTargetIndex = $state<number>(-1);
    draggingStartIndex = $state<number>(-1);

    private longPressTimer: ReturnType<typeof setTimeout> | null = null;
    private tapTimer: ReturnType<typeof setTimeout> | null = null;
    private lastTapTime = 0;
    private DOUBLE_TAP_WINDOW = 300;
    private isPressing = false;
    private _touchMovedSignificant = false;
    private startedOnHandle = false;
    private lastDragEndTime = 0;

    constructor(private config: GestureManagerConfig) { }

    get touchMovedSignificant() {
        return this._touchMovedSignificant;
    }
    set touchMovedSignificant(val: boolean) {
        this._touchMovedSignificant = val;
    }

    getCardTransform(taskId: string): string {
        if (this.swipingTaskId === taskId) {
            const deltaX = this.touchCurrentX - this.touchStartX;
            const rotation = deltaX / 20;
            return `translateX(${deltaX}px) rotate(${rotation}deg)`;
        }
        if (this.draggingTaskId === taskId) {
            const deltaY = this.touchCurrentY - this.touchStartY;
            return `translateY(${deltaY}px) scale(1.02) rotate(1deg)`;
        }
        return "";
    }

    private getResolvedSwipe(deltaX: number, deltaY: number): "left" | "right" | "none" {
        if (!this.config.isMobileState()) return "none";
        return resolveSwipe(deltaX, deltaY);
    }

    handlePointerStart(e: PointerEvent, taskId: string) {
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        this.config.onInteractionStart();

        const target = e.target as HTMLElement;
        this.startedOnHandle = !!target.closest(".drag-handle");

        this.isPressing = true;
        this._touchMovedSignificant = false;
        this.touchStartX = e.clientX;
        this.touchStartY = e.clientY;
        this.touchCurrentX = e.clientX;
        this.touchCurrentY = e.clientY;
        this.swipingTaskId = taskId;

        const tasks = this.config.getTasks();
        const index = tasks.findIndex((t) => t.id === taskId);
        const task = tasks[index];

        if (!task) return;

        if (this.longPressTimer) clearTimeout(this.longPressTimer);
        if (this.config.isMobileState() && this.config.settings?.longPressAction) {
            this.longPressTimer = setTimeout(async () => {
                if (this.isPressing && !this.swipingTaskId && !this.draggingTaskId && !this._touchMovedSignificant) {
                    if (typeof window !== 'undefined' && (window as any).obsidian?.haptics) {
                        (window as any).obsidian.haptics.impact("heavy");
                    }
                    await this.config.onGestureAction(this.config.settings.longPressAction, task, index);
                    this.isPressing = false;
                }
            }, 500);
        }
    }

    handlePointerMove(e: PointerEvent) {
        if (!this.isPressing && !this.swipingTaskId && !this.draggingTaskId) return;

        this.touchCurrentX = e.clientX;
        this.touchCurrentY = e.clientY;

        const dx = this.touchCurrentX - this.touchStartX;
        const dy = this.touchCurrentY - this.touchStartY;

        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            this._touchMovedSignificant = true;
        }

        if (!this.swipingTaskId && !this.draggingTaskId) {
            if (this.startedOnHandle && Math.abs(dy) > 5) {
                const tasks = this.config.getTasks();
                const elements = this.config.getTaskElements();

                let bestStart = -1;
                let minStartDist = Infinity;
                for (let i = 0; i < elements.length; i++) {
                    const el = elements[i];
                    if (!el) continue;
                    const rect = el.getBoundingClientRect();
                    const elCenter = rect.top + rect.height / 2;
                    const distance = Math.abs(this.touchStartY - elCenter);
                    if (distance < minStartDist) {
                        minStartDist = distance;
                        bestStart = i;
                    }
                }
                if (bestStart !== -1 && tasks[bestStart]) {
                    this.draggingTaskId = tasks[bestStart]!.id;
                    this.draggingStartIndex = bestStart;
                    this.dragTargetIndex = bestStart;
                }
            } else if (!this.config.isMobileState() && Math.abs(dx) > 15 && !this.startedOnHandle) {
                this.isPressing = false;
            }
        }

        if (this.draggingTaskId) {
            const elements = this.config.getTaskElements();
            let bestTarget = -1;
            let minDistance = Infinity;

            for (let i = 0; i < elements.length; i++) {
                const el = elements[i];
                if (!el) continue;
                const rect = el.getBoundingClientRect();
                const elCenter = rect.top + rect.height / 2;
                const distance = Math.abs(this.touchCurrentY - elCenter);

                if (distance < minDistance) {
                    minDistance = distance;
                    bestTarget = i;
                }
            }

            if (bestTarget !== -1 && bestTarget !== this.dragTargetIndex) {
                this.dragTargetIndex = bestTarget;
            }
        }
    }

    async handlePointerEnd(e: PointerEvent, task: TaskNode) {
        if (!this.swipingTaskId && !this.draggingTaskId) {
            return;
        }

        this.isPressing = false;
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        if (this.draggingTaskId) {
            this.config.unfreezeController();

            if (this.dragTargetIndex !== -1 && this.dragTargetIndex !== this.draggingStartIndex && this.dragTargetIndex < this.config.getTasks().length) {
                await this.config.onReorder(this.draggingStartIndex, this.dragTargetIndex);
            } else {
                this.config.unlockPersistence();
            }

            this.lastDragEndTime = Date.now();
            this.draggingTaskId = null;
            this.draggingStartIndex = -1;
            this.dragTargetIndex = -1;
            this.swipingTaskId = null;
            this.touchStartX = 0;
            this.touchCurrentX = 0;
            return;
        }

        this.config.unfreezeController();
        this.config.unlockPersistence();

        const deltaX = this.touchCurrentX - this.touchStartX;
        const deltaY = this.touchCurrentY - this.touchStartY;
        const swipe = this.getResolvedSwipe(deltaX, deltaY);

        const tasks = this.config.getTasks();
        const index = tasks.findIndex((t) => t.id === task.id);

        if (index !== -1) {
            if (swipe === "right") {
                await this.config.onGestureAction(this.config.isMobileState() ? "complete" : this.config.settings.swipeRightAction, task, index);
            } else if (swipe === "left") {
                await this.config.onGestureAction(this.config.isMobileState() ? "archive" : this.config.settings.swipeLeftAction, task, index);
            }
        }

        this.swipingTaskId = null;
        this.touchStartX = 0;
        this.touchCurrentX = 0;
    }

    handlePointerCancel(e: PointerEvent) {
        this.config.unfreezeController();
        this.config.unlockPersistence();

        this.isPressing = false;
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        this.swipingTaskId = null;
        this.draggingTaskId = null;
        this.dragTargetIndex = -1;
        this.draggingStartIndex = -1;
    }

    handleTouchBlocking(e: TouchEvent) {
        e.stopPropagation();

        const dx = Math.abs(this.touchCurrentX - this.touchStartX);
        const dy = Math.abs(this.touchCurrentY - this.touchStartY);

        if (dx > 10 || dy > 10) {
            this._touchMovedSignificant = true;
        }

        if (this.draggingTaskId) {
            if (e.cancelable) e.preventDefault();
        } else if (this.swipingTaskId && (dx > 10 || dy > 10)) {
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

    async handleTap(e: MouseEvent, task: TaskNode, index: number, isSyncing: boolean, editingActive: boolean) {
        if (isSyncing) {
            new (window as any).Notice("Syncing in progress. Please wait...");
            return;
        }
        if (editingActive) return;

        if (this._touchMovedSignificant) {
            this._touchMovedSignificant = false;
            return;
        }

        const now = Date.now();
        if (now - this.lastDragEndTime < 300) {
            return;
        }

        const delta = now - this.lastTapTime;
        this.lastTapTime = now;

        if (delta < this.DOUBLE_TAP_WINDOW) {
            if (this.tapTimer) {
                clearTimeout(this.tapTimer);
                this.tapTimer = null;
            }

            await this.config.onGestureAction(this.config.isMobileState() ? "anchor" : this.config.settings.doubleTapAction, task, index);
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
