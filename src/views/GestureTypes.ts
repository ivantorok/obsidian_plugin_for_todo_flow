import type { TaskNode } from "../scheduler.js";

export interface GestureManagerConfig {
    isMobileState: () => boolean;
    getTasks: () => TaskNode[];
    getTaskElements: () => HTMLElement[];
    onGestureAction: (actionType: string, task: TaskNode, index: number) => Promise<void>;
    onReorder: (startIndex: number, targetIndex: number) => Promise<void>;
    onFocusAction: (index: number) => void;
    onDrillDown: (taskId: string, index: number) => void;
    settings: any;
    onInteractionStart: () => void;
    unlockPersistence: () => void;
    unfreezeController: () => void;
    debugLogger?: { info: (msg: string) => void };
}
