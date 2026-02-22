import { type KeybindingSettings, DEFAULT_KEYBINDINGS } from './keybindings.js';

export interface TodoFlowSettings {
    targetFolder: string;
    exportFolder: string;
    timingMode: 'now' | 'fixed';
    fixedStartTime: string;
    keys: KeybindingSettings;
    debug: boolean;
    enableShake: boolean;
    traceVaultEvents: boolean;
    maxGraphDepth: number;
    lastTray?: string[] | null;
    swipeLeftAction: string;
    swipeRightAction: string;
    doubleTapAction: string;
    longPressAction: string;
    absoluteLogPath: string; // Absolute path to write logs (bypasses vault)
}

export const DEFAULT_SETTINGS: TodoFlowSettings = {
    targetFolder: 'todo-flow',
    exportFolder: '',
    timingMode: 'now',
    fixedStartTime: '09:00',
    keys: DEFAULT_KEYBINDINGS,
    debug: false,
    enableShake: false,
    traceVaultEvents: false,
    maxGraphDepth: 5,
    lastTray: null,
    swipeLeftAction: 'archive',
    swipeRightAction: 'complete',
    doubleTapAction: 'anchor',
    longPressAction: 'none',
    absoluteLogPath: ''
}
