export type Action =
    | 'NAV_UP'
    | 'NAV_DOWN'
    | 'MOVE_UP'
    | 'MOVE_DOWN'
    | 'ANCHOR'
    | 'DURATION_UP'
    | 'DURATION_DOWN'
    | 'UNDO'
    | 'REDO'
    | 'CONFIRM'
    | 'CANCEL'
    | 'TOGGLE_DONE'
    | 'CREATE_TASK'
    | 'DELETE_TASK'
    | 'FORCE_OPEN'
    | 'GO_BACK'
    | 'EXPORT'
    | 'RENAME'
    | 'ARCHIVE'
    | 'QUICK_ADD'
    | 'EDIT_START_TIME'
    | 'TOGGLE_HELP';

export interface KeybindingSettings {
    navUp: string[];
    navDown: string[];
    moveUp: string[];
    moveDown: string[];
    anchor: string[];
    durationUp: string[];
    durationDown: string[];
    undo: string[];
    redo: string[];
    confirm: string[];
    cancel: string[];
    toggleDone: string[];
    createTask: string[];
    deleteTask: string[];
    forceOpen: string[];
    goBack: string[];
    export: string[];
    rename: string[];
    archive: string[];
    quickAdd: string[];
    editStartTime: string[];
    toggleHelp: string[];
    debug?: boolean;
}

export const DEFAULT_KEYBINDINGS: KeybindingSettings = {
    navUp: ['k', 'ArrowUp'],
    navDown: ['j', 'ArrowDown'],
    moveUp: ['K', 'Shift+ArrowUp'],
    moveDown: ['J', 'Shift+ArrowDown'],
    anchor: ['Shift+F'],
    durationUp: ['f', 'ArrowRight'],
    durationDown: ['d', 'ArrowLeft'],
    undo: ['u', 'U'],
    redo: ['Shift+U'],
    confirm: ['Enter'],
    cancel: ['Escape'],
    toggleDone: ['x', 'X'],
    createTask: ['c', 'C', 'a', 'A'],
    deleteTask: ['Backspace', 'Delete'],
    forceOpen: ['Shift+Enter', 'Alt+Enter', 'Cmd+Enter', 'Ctrl+Enter'],
    goBack: ['h'],
    export: ['Shift+E', 'Cmd+s', 'Ctrl+s'],
    rename: ['e'],
    archive: ['z', 'Z'],
    quickAdd: ['o'],
    editStartTime: ['s'],
    toggleHelp: ['?']
};

export class KeybindingManager {
    constructor(private settings: KeybindingSettings) { }

    resolveAction(e: KeyboardEvent): Action | null {
        for (const [settingKey, combos] of Object.entries(this.settings)) {
            if (Array.isArray(combos) && combos.some(combo => this.matchesBinding(combo, e))) {
                const action = this.mapToActions(settingKey);
                if (action) {
                    return action;
                }
            }
        }
        return null;
    }

    private mapToActions(settingKey: string): Action | null {
        const mapping: Record<string, Action> = {
            navUp: 'NAV_UP',
            navDown: 'NAV_DOWN',
            moveUp: 'MOVE_UP',
            moveDown: 'MOVE_DOWN',
            anchor: 'ANCHOR',
            durationUp: 'DURATION_UP',
            durationDown: 'DURATION_DOWN',
            undo: 'UNDO',
            redo: 'REDO',
            confirm: 'CONFIRM',
            cancel: 'CANCEL',
            toggleDone: 'TOGGLE_DONE',
            createTask: 'CREATE_TASK',
            deleteTask: 'DELETE_TASK',
            forceOpen: 'FORCE_OPEN',
            goBack: 'GO_BACK',
            export: 'EXPORT',
            rename: 'RENAME',
            archive: 'ARCHIVE',
            quickAdd: 'QUICK_ADD',
            editStartTime: 'EDIT_START_TIME',
            toggleHelp: 'TOGGLE_HELP'
        };
        return mapping[settingKey] || null;
    }

    private matchesBinding(binding: string, e: KeyboardEvent): boolean {
        const parts = binding.split('+');
        const requiredKey = parts[parts.length - 1]!;
        const requiredModifiers = parts.slice(0, -1);

        let match = false;

        // 1. Check Key Match
        const isSingleLetter = requiredKey.length === 1 && requiredKey.toLowerCase() !== requiredKey.toUpperCase();

        if (isSingleLetter) {
            if (requiredModifiers.length === 0) {
                // Strict char match for "j" vs "J"
                if (e.key === requiredKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
                    match = true;
                }
            } else {
                // "Shift+f" -> e.key='F'
                if (e.key.toLowerCase() === requiredKey.toLowerCase()) {
                    match = true;
                }
            }
        } else {
            if (requiredKey === e.key || requiredKey === e.code) {
                match = true;
            }
        }

        if (!match) return false;

        // 2. Check Modifiers
        const hasShift = requiredModifiers.includes('Shift');
        const hasCtrl = requiredModifiers.includes('Ctrl');
        const hasAlt = requiredModifiers.includes('Alt');
        const hasMeta = requiredModifiers.includes('Meta');

        let modifiersMatch = (!!e.ctrlKey === hasCtrl) && (!!e.altKey === hasAlt) && (!!e.metaKey === hasMeta);

        if (!!e.shiftKey !== hasShift) {
            // Exception: If the key itself implies shift (e.g. '?' or '!') and matches exactly, allow it.
            if (requiredKey.length === 1 && e.key === requiredKey && !hasShift && e.shiftKey) {
                // Allow
            } else {
                modifiersMatch = false;
            }
        }

        if (match && modifiersMatch) {
            if (this.settings.debug) {
                console.debug(`[TODO_FLOW_TRACE] MATCHED binding=${binding} for key=${e.key} (code=${e.code})`);
            }
            return true;
        }

        return false;
    }
}
