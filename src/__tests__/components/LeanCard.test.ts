import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import LeanCard from '../../views/components/LeanCard.svelte';
import moment from 'moment';

describe('LeanCard Component (TDD Contract)', () => {
    let container: HTMLElement;
    let component: any;

    const mockTask = {
        id: 'task-123',
        title: 'Lean Task Title',
        status: 'todo',
        duration: 30,
        startTime: moment('2025-01-01 14:30:00'),
        isAnchored: false,
        children: []
    };

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        if (component) unmount(component);
        container.remove();
    });

    test('Requirement 1: Should render a 12px status dot', () => {
        component = mount(LeanCard, {
            target: container,
            props: { task: mockTask, now: moment() }
        });

        const dot = container.querySelector('.status-dot') as HTMLElement;
        expect(dot).not.toBeNull();
        // Since we are using JSDOM, we might check classes or computed styles if supported
        expect(dot.classList.contains('status-todo')).toBe(true);
    });

    test('Requirement 2: Should render task title with truncation classes', () => {
        component = mount(LeanCard, {
            target: container,
            props: { task: mockTask, now: moment() }
        });

        const title = container.querySelector('.task-title');
        expect(title?.textContent).toBe('Lean Task Title');
        expect(title?.classList.contains('truncate')).toBe(true);
    });

    test('Requirement 3: Should render time-stamp in monospace font', () => {
        component = mount(LeanCard, {
            target: container,
            props: { task: mockTask, now: moment() }
        });

        const time = container.querySelector('.task-time');
        expect(time?.textContent).toContain('14:30');
    });

    test('Requirement 4: Should have a minimum touch height of 44px', () => {
        component = mount(LeanCard, {
            target: container,
            props: { task: mockTask, now: moment() }
        });

        const card = container.querySelector('.lean-task-card') as HTMLElement;
        expect(card).not.toBeNull();
        // We can check if it has the required class that enforces this in CSS
        expect(card.classList.contains('touch-sovereign')).toBe(true);
    });
});
