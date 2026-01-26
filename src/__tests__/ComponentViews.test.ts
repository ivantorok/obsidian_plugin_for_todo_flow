import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import TriageViewSvelte from '../views/TriageView.svelte';
import StackViewSvelte from '../views/StackView.svelte';
import moment from 'moment';

describe('TriageView.svelte', () => {
    it('should render task title', () => {
        const mockTasks = [{ title: 'My Clean Task', duration: 30 }] as any;
        render(TriageViewSvelte, {
            props: {
                tasks: mockTasks,
                keys: { navUp: ['k'], navDown: ['j'], confirm: ['Enter'], cancel: ['Escape'] } as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any,
                onComplete: () => { }
            }
        });

        expect(screen.getByText('My Clean Task')).toBeTruthy();
        expect(screen.getAllByText(/Not Now/i).length).toBeGreaterThan(0);
    });
});

describe('StackView.svelte', () => {
    it('should render the timeline with formatted durations', () => {
        const mockTasks = [
            { id: '1', title: 'Task 1', duration: 30, isAnchored: false, startTime: moment() },
            { id: '2', title: 'Task 2', duration: 90, isAnchored: false, startTime: moment() }
        ] as any;
        render(StackViewSvelte, {
            props: {
                initialTasks: mockTasks,
                now: moment(),
                settings: { keys: { navUp: ['k'], navDown: ['j'] }, timingMode: 'now' } as any,
                logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any
            }
        });

        expect(screen.getByText('Task 1')).toBeTruthy();
        expect(screen.getByText('30m')).toBeTruthy();
        expect(screen.getByText('Task 2')).toBeTruthy();
        expect(screen.getByText('1h 30m')).toBeTruthy();
    });
});
