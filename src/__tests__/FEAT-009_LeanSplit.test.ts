import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import FocusStack from '../views/FocusStackHardShell.svelte';
import moment from 'moment';

describe('FEAT-009: FocusStack Zero-Physics', () => {
    let mockProps: any;

    beforeEach(() => {
        mockProps = {
            navState: {
                tasks: [
                    { id: 'task-1', title: 'Task 1', status: 'todo', duration: 30, startTime: moment() }
                ],
                focusedIndex: 0,
                isMobile: true,
                viewMode: 'focus'
            },
            controller: {},
            now: moment(),
            settings: {},
            executeGestureAction: vi.fn(),
            onTap: vi.fn(),
            openDurationPicker: vi.fn()
        };
    });

    it('should NOT render action tray buttons (Offloaded to DetailedView)', () => {
        const { queryByText } = render(FocusStack, { props: mockProps });
        expect(queryByText('Complete')).toBeNull();
        expect(queryByText('Archive')).toBeNull();
        expect(queryByText('Anchor')).toBeNull();
        expect(queryByText('Next →')).toBeDefined();
    });

    it('should respect navigation buttons', async () => {
        mockProps.navState.tasks.push({ id: 'task-2', title: 'Task 2', status: 'todo', duration: 30, startTime: moment() });
        const { getByText } = render(FocusStack, { props: mockProps });

        const nextBtn = getByText('Next →');
        await nextBtn.click();

        expect(mockProps.navState.focusedIndex).toBe(1);
    });
});
