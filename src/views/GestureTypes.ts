import type { TaskNode } from "../scheduler.js";

export interface GestureState {
    touchStartX: number;
    touchStartY: number;
    touchCurrentX: number;
    touchCurrentY: number;
    swipingTaskId: string | null;
    draggingTaskId: string | null;
    dragTargetIndex: number;
    draggingStartIndex: number;
}

export interface GestureManagerConfig {
    isMobileState: () => boolean;
    getTasks: () => TaskNode[];
    getTaskElements: () => HTMLElement[];
    onGestureAction: (actionType: string, task: TaskNode, index: number) => Promise<void>;
    onReorder: (startIndex: number, targetIndex: number) => Promise<void>;
    onFocusAction: (index: number) => void;
    onDrillDown: (taskId: string, index: number) => void;
    getSettings: () => any;
    onInteractionStart: () => void;
    unlockPersistence: () => void;
    unfreezeController: () => void;
    debugLogger?: { info: (msg: string) => void; error?: (msg: string) => void; warn?: (msg: string) => void };
}

export interface KeyboardManagerConfig {
    isSyncing: () => boolean;
    getTasks: () => any[]; // TaskNode[]
    getFocusedIndex: () => number;
    setFocusedIndex: (index: number) => void;
    isMobileState: () => boolean;
    getSettings: () => any; // TodoFlowSettings
    logger: any;
    isMounted: () => boolean;
    isShowHelp: () => boolean;
    setShowHelp: (show: boolean) => void;
    getEditingIndex: () => number;
    getEditingStartTimeIndex: () => number;
    onOpenFile: (path: string) => void;
    onGoBack: () => Promise<void> | void;
    onNavigate: (id: string, index: number) => void;
    onFocusChange: (index: number) => void;
    openQuickAddModal: (index: number) => void;
    onExport: (tasks: any[]) => void;
    onTaskUpdate: (task: any) => Promise<void> | void;
    historyManager: any;
    controller: any;
    update: () => void;
    startRename: (index: number) => void;
    startEditStartTime: (index: number) => void;
    clearTapTimer: () => void;
    persistenceService?: any;
    getKeyManager: () => any;
}

export interface InputManagerConfig {
    getTasks: () => TaskNode[];
    getRenamingText: () => string;
    setRenamingText: (val: string) => void;
    setEditingIndex: (val: number) => void;
    setEditingStartTimeIndex: (val: number) => void;
    getRenameInputs: () => HTMLInputElement[];
    getContainerEl: () => HTMLElement | null;
    logger: any;
    getController: () => any;
    getHistoryManager: () => any;
    update: () => void;
    isSyncing: () => boolean;
}

export interface StateManagerConfig {
    getNavState: () => any; // StackUIState
    setNavState: (val: any) => void;
    getController: () => any; // StackController
    getInternalNow: () => any; // moment.Moment
    getRerenderTick: () => number;
    setRerenderTick: (val: number) => void;
    getEditingIndex: () => number;
    getEditingStartTimeIndex: () => number;
    logger: any;
    onFocusChange?: (index: number) => void;
    onStackChange?: (tasks: any[], index?: number) => void;
    getSettings: () => any;
}
