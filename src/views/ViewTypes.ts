import { type TaskNode } from '../scheduler.js';

export interface StackUIState {
    tasks: TaskNode[];
    focusedIndex: number;
    parentTaskName: string | null;
    canGoBack: boolean;
    rootPath: string | null;
    isMobile: boolean;
}
