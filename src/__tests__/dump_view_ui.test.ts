import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import DumpView from '../views/DumpView.svelte';
import type { App } from 'obsidian';

describe('DumpView UI Structure', () => {
    it('should render the minimal card layout', () => {
        const mockApp = {
            vault: {
                create: vi.fn(),
                getAbstractFileByPath: vi.fn()
            }
        } as unknown as App;

        const { container } = render(DumpView, {
            props: {
                app: mockApp,
                folder: 'todo-flow'
            }
        });

        // Verify Card Structure
        // now using unified Card component
        const card = container.querySelector('.todo-flow-card.variant-dump');
        expect(card).toBeTruthy();

        // Verify Header (inside card)
        const header = container.querySelector('.todo-flow-card-header');
        expect(header).toBeTruthy();
        expect(header!.textContent).toBe('Dump your thoughts');

        // Verify Input
        const input = container.querySelector('.todo-flow-dump-input') as HTMLTextAreaElement;
        expect(input).toBeTruthy();
        expect(input!.placeholder).toContain('Type and press Enter...');

        // Verify Hint
        const hint = container.querySelector('.todo-flow-dump-hint');
        expect(hint).toBeTruthy();
        expect(hint!.textContent).toContain('Type done and press Enter to start triage');
    });
});
