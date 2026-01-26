import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import HelpModal from '../views/HelpModal.svelte';
import { DEFAULT_KEYBINDINGS, type KeybindingSettings } from '../keybindings.js';

describe('Help Layer Integrity ❓', () => {
    it('should render correct key labels from props', () => {
        // Create custom settings that identify uniquely (avoiding defaults)
        const customKeys: KeybindingSettings = {
            ...DEFAULT_KEYBINDINGS,
            navDown: ['CustomDown'],
            navUp: ['CustomUp'],
            moveDown: ['Alt+Down'],
            anchor: ['Ctrl+A'],
            rename: ['F2']
        };

        const { container } = render(HelpModal, {
            props: {
                keys: customKeys,
                settings: { timingMode: 'now', fixedStartTime: '09:00' } as any
            }
        });

        const text = container.textContent || '';

        // Navigation Section
        expect(text).toContain('CustomDown');
        expect(text).toContain('CustomUp');

        // Organization Section
        expect(text).toContain('Opt+Down'); // Alt -> Opt formatter check
        expect(text).toContain('Ctrl+A');

        // Actions Section
        expect(text).toContain('F2');
        expect(text).toContain('Rename Task');

        // Check Formatter Logic via verify
        // 'Alt+Down' should render as 'Opt' + '↓' if we mapped ArrowDown -> ↓, 
        // but here we passed raw 'CustomDown' so it stays.
    });

    it('should format special keys correctly (Arrow -> Symbol)', () => {
        const customKeys: KeybindingSettings = {
            ...DEFAULT_KEYBINDINGS,
            durationDown: ['Shift+ArrowLeft'],
            durationUp: ['Shift+ArrowRight'],
            confirm: ['Enter'],
            deleteTask: ['Backspace']
        };

        const { container } = render(HelpModal, {
            props: {
                keys: customKeys,
                settings: { timingMode: 'now', fixedStartTime: '09:00' } as any
            }
        });

        // We look for the symbols the formatter is expected to produce
        const keys = Array.from(container.querySelectorAll('.key')).map(el => el.textContent?.trim());

        // Shift+ArrowLeft -> ⇧ + ←
        expect(keys).toContain('⇧+←');

        // Enter -> ⏎
        expect(keys).toContain('⏎');

        // Backspace -> ⌫
        expect(keys).toContain('⌫');
    });

    it('should reflect current DEFAULT_KEYBINDINGS exactly', () => {
        const { container } = render(HelpModal, {
            props: {
                keys: DEFAULT_KEYBINDINGS,
                settings: { timingMode: 'now', fixedStartTime: '09:00' } as any
            }
        });

        const text = container.textContent || '';

        // Check new 2024 standards
        const goBackRow = Array.from(container.querySelectorAll('.row'))
            .find(row => row.textContent?.includes('Go Back'));

        expect(goBackRow?.textContent).toContain('h');
        expect(goBackRow?.textContent).not.toContain('←'); // Go Back is strictly 'h'

        // durationDown: ['d', 'ArrowLeft'] -> 'd' / '←'
        const durationRow = Array.from(container.querySelectorAll('.row'))
            .find(row => row.textContent?.includes('Adjust Duration'));

        expect(durationRow?.textContent).toContain('d');
        expect(durationRow?.textContent).toContain('←');
    });
});
