import { browser, expect, $ } from '@wdio/globals';
import { setupStackWithTasks } from './e2e_utils.js';

describe('BUG-008: Desktop Duration Buttons', () => {
    beforeEach(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    it('should adjust duration by clicking +/- buttons on desktop', async () => {
        await setupStackWithTasks(['Button Test']);

        // Check initial duration
        // @ts-ignore
        let duration = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].duration;
        });
        expect(duration).toBe(30);

        // Click "+" button
        const plusBtn = await $('.duration-btn.plus');
        await plusBtn.waitForDisplayed();
        await plusBtn.click(); // Standard click for desktop

        // Check again
        // @ts-ignore
        duration = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].duration;
        });

        // If it's broken, it will still be 30. If fixed, it should be 45 (next in sequence).
        expect(duration).toBe(45);

        // Click "-" button
        const minusBtn = await $('.duration-btn.minus');
        await minusBtn.click();

        // Check again
        // @ts-ignore
        duration = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].duration;
        });
        expect(duration).toBe(30);
    });
});
