import { describe, it, expect } from 'vitest';
import { DEFAULT_KEYBINDINGS } from '../keybindings.js';

describe('Keybinding Collision Lab 🎹', () => {
    it('should NOT have duplicate key assignments across different actions', () => {
        const keyMap = new Map<string, string[]>();

        // Iterate through all settings
        for (const [actionName, combos] of Object.entries(DEFAULT_KEYBINDINGS)) {
            // Check if it's an array (since settings might contain boolean flags like 'debug')
            if (Array.isArray(combos)) {
                for (const combo of combos) {
                    // Normalize combo for comparison (optional, but good practice)
                    const normalized = combo;

                    if (!keyMap.has(normalized)) {
                        keyMap.set(normalized, []);
                    }
                    keyMap.get(normalized)!.push(actionName);
                }
            }
        }

        // Find collisions
        const collisions: string[] = [];
        for (const [key, actions] of keyMap.entries()) {
            if (actions.length > 1) {
                collisions.push(`Key "${key}" is assigned to multiple actions: [${actions.join(', ')}]`);
            }
        }

        // Assert
        if (collisions.length > 0) {
            console.error('\n🚨 KEYBINDING COLLISIONS DETECTED 🚨');
            collisions.forEach(c => console.error(c));
        }

        expect(collisions).toEqual([]);
    });

    it('should define distinct actions for commonly confused keys', () => {
        // Specific checks for dangerous overlaps
        const enterActions = DEFAULT_KEYBINDINGS.confirm || [];
        const shiftEnterActions = DEFAULT_KEYBINDINGS.forceOpen || [];

        expect(enterActions).not.toEqual(expect.arrayContaining(shiftEnterActions));
    });
});
