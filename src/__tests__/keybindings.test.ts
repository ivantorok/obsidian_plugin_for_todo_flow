import { describe, it, expect } from 'vitest';
import { KeybindingManager, type KeybindingSettings } from '../keybindings.js';

describe('Keybinding Manager', () => {
    const defaultSettings: KeybindingSettings = {
        navUp: ['k', 'ArrowUp'],
        navDown: ['j', 'ArrowDown'],
        moveUp: ['K', 'Shift+ArrowUp'],
        moveDown: ['J', 'Shift+ArrowDown'],
        anchor: ['Shift+F'],
        durationUp: ['f', 'Shift+ArrowRight'],
        durationDown: ['d', 'ArrowLeft'],
        undo: ['u', 'U'],
        redo: ['Shift+U'],
        confirm: ['Enter'],
        cancel: ['Escape'],
        toggleDone: ['x', 'X'],
        createTask: ['c', 'C'],
        deleteTask: ['Backspace', 'Delete'],
        forceOpen: ['Shift+Enter', 'Meta+Enter'],
        goBack: ['h'],
        export: ['Shift+E', 'Cmd+s', 'Ctrl+s'],
        rename: ['e'],
        archive: ['z', 'Z'],
        quickAdd: ['o'],
        toggleHelp: ['?']
    };

    const manager = new KeybindingManager(defaultSettings);

    it('should resolve simple keys', () => {
        const event = { key: 'j', code: 'KeyJ' } as KeyboardEvent;
        expect(manager.resolveAction(event)).toBe('NAV_DOWN');
    });

    it('should resolve mapped keys (arrows)', () => {
        const event = { key: 'ArrowDown', code: 'ArrowDown' } as KeyboardEvent;
        expect(manager.resolveAction(event)).toBe('NAV_DOWN');
    });

    it('should resolve modifiers', () => {
        const event = { key: 'ArrowUp', code: 'ArrowUp', shiftKey: true } as KeyboardEvent;
        expect(manager.resolveAction(event)).toBe('MOVE_UP');
    });

    it('should respect case sensitivity for single letters', () => {
        // "j" -> NAV_DOWN
        expect(manager.resolveAction({ key: 'j', code: 'KeyJ' } as KeyboardEvent)).toBe('NAV_DOWN');

        // "J" -> MOVE_DOWN
        expect(manager.resolveAction({ key: 'J', code: 'KeyJ', shiftKey: true } as KeyboardEvent)).toBe('MOVE_DOWN');

        // Just "J" (Caps lock or shift held implicitly)
        expect(manager.resolveAction({ key: 'J', code: 'KeyJ' } as KeyboardEvent)).toBe('MOVE_DOWN');
    });
});
