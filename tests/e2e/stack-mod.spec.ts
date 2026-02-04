import { browser, expect, $ } from '@wdio/globals';
import { setupStackWithTasks } from './e2e_utils.js';

describe('Stack Modification (Reorder/Rename/Archive)', () => {
    beforeEach(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    it('should reorder tasks with Shift+K and Shift+J', async () => {
        await setupStackWithTasks(['Task A', 'Task B', 'Task C']);

        // Get initial order
        // @ts-ignore
        let titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            // @ts-ignore
            return view.getTasks().map(t => t.title);
        });
        console.log('[Test] Initial order:', titles);
        expect(titles).toEqual(['Task A', 'Task B', 'Task C']);

        // Focus on Task B (index 1)
        // @ts-ignore
        await browser.keys(['j']);
        // @ts-ignore
        await browser.pause(200);

        // Move Task B up with Shift+K
        // @ts-ignore
        await browser.keys(['K']);
        // @ts-ignore
        await browser.pause(500);

        // @ts-ignore
        titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            // @ts-ignore
            return view.getTasks().map(t => t.title);
        });
        console.log('[Test] After move up:', titles);
        expect(titles).toEqual(['Task B', 'Task A', 'Task C']);

        // Move Task B down with Shift+J
        // @ts-ignore
        await browser.keys(['J']);
        // @ts-ignore
        await browser.pause(500);

        // @ts-ignore
        titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            // @ts-ignore
            return view.getTasks().map(t => t.title);
        });
        console.log('[Test] After move down:', titles);
        expect(titles).toEqual(['Task A', 'Task B', 'Task C']);

        console.log('[Test] ✅ Reordering with Shift+K/J works correctly');
    });

    it('should rename task with e key', async () => {
        await setupStackWithTasks(['Original Name']);

        // Get initial title
        // @ts-ignore
        let title = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].title;
        });
        expect(title).toBe('Original Name');

        // Focus the stack and press 'e' to start rename
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            const leaf = app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
            if (leaf) {
                // @ts-ignore
                app.workspace.setActiveLeaf(leaf, { focus: true });
                const container = document.querySelector('.todo-flow-stack-container');
                if (container) (container as HTMLElement).focus();
            }
        });
        // @ts-ignore
        await browser.keys(['e']);
        // @ts-ignore
        await browser.pause(1000);

        const input = await $('.todo-flow-title-input');
        await input.waitForDisplayed({ timeout: 2000 });

        // User workflow: ArrowRight to deselect and go to end, then add space and text
        // @ts-ignore
        await browser.keys(['ArrowRight']);
        // @ts-ignore
        await browser.pause(200);
        // @ts-ignore
        await browser.keys([' ']);
        // @ts-ignore
        await browser.pause(200);
        // @ts-ignore
        await browser.keys(['R', 'e', 'n', 'a', 'm', 'e', 'd']);
        // @ts-ignore
        await browser.pause(200);
        // @ts-ignore
        await browser.keys(['Enter']);
        // @ts-ignore
        await browser.pause(500);

        // Verify the title changed: "Original Name Renamed"
        // @ts-ignore
        title = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].title;
        });
        expect(title).toBe('Original Name Renamed');

        console.log('[Test] ✅ Rename works correctly');
    });

    it('should archive task with z key', async () => {
        await setupStackWithTasks(['Archive Me']);

        // Verify task exists
        // @ts-ignore
        let taskCount = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks().length;
        });
        expect(taskCount).toBe(1);

        // Archive with z
        // @ts-ignore
        await browser.keys(['z']);
        // @ts-ignore
        await browser.pause(500);

        // Verify task is gone
        // @ts-ignore
        taskCount = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks().length;
        });
        expect(taskCount).toBe(0);

        console.log('[Test] ✅ Archive works correctly');
    });
});
