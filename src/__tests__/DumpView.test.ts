import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import DumpViewSvelte from '../views/DumpView.svelte';

describe('DumpView.svelte', () => {
    it('should render the thought input', () => {
        render(DumpViewSvelte, {
            props: {
                app: {} as any,
                folder: 'todo-flow'
            }
        });

        const textarea = screen.getByPlaceholderText(/Type and press Enter/i);
        expect(textarea).toBeTruthy();
    });
});
