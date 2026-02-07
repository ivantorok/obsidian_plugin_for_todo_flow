import { browser, expect } from '@wdio/globals';
import { setupStackWithTasks } from './e2e_utils.js';

describe('Stack Navigation (j/k)', () => {
    beforeEach(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    it('should navigate with j/k keys', async () => {
        await setupStackWithTasks(['Task 1', 'Task 2', 'Task 3']);

        // Check initial focus (should be 0)
        // @ts-ignore
        let focusIndex = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.component.getFocusedIndex();
        });
        expect(focusIndex).toBe(0);

        // Navigate down with j
        // @ts-ignore
        await browser.keys(['j']);
        // @ts-ignore
        await browser.pause(200);

        // @ts-ignore
        focusIndex = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.component.getFocusedIndex();
        });
        expect(focusIndex).toBe(1);

        // Navigate down again
        // @ts-ignore
        await browser.keys(['j']);
        // @ts-ignore
        await browser.pause(200);

        // @ts-ignore
        focusIndex = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.component.getFocusedIndex();
        });
        expect(focusIndex).toBe(2);

        // Navigate up with k
        // @ts-ignore
        await browser.keys(['k']);
        // @ts-ignore
        await browser.pause(200);

        // @ts-ignore
        focusIndex = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.component.getFocusedIndex();
        });
        expect(focusIndex).toBe(1);

        console.log('[Test] ✅ Navigation with j/k works correctly');
    });
});
