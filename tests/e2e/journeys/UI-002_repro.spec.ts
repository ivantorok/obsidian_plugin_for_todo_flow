import { browser, expect, $ } from '@wdio/globals';
import { emulateMobile } from '../mobile_utils.js';
import { setupStackWithTasks, focusStack } from '../e2e_utils.js';
import { cleanupVault } from '../test_utils.js';

describe('UI-002: Long Title Overflow Reproduction', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await emulateMobile();
    });

    after(async function () {
        await cleanupVault();
    });

    it('should truncate long task titles without overflowing the card', async () => {
        const longTitle = 'LongTitle_'.repeat(30); // 300 characters to be very sure

        await setupStackWithTasks([longTitle]);

        // Ensure UI is ready
        await $('.todo-flow-stack-container[data-ui-ready="true"]').waitForExist({ timeout: 10000 });
        await focusStack();

        // The card uses .todo-flow-task-card class (from StackView.svelte)
        const card = await $('.todo-flow-task-card');
        await card.waitForExist({ timeout: 10000 });

        // The title is a button with class 'title'
        const title = await card.$('.title');
        await title.waitForExist({ timeout: 5000 });

        // Check if text is actually truncated (scrollWidth > offsetWidth)
        // We use a waitUntil to allow Svelte a moment to apply styles
        await browser.waitUntil(async () => {
            return await browser.execute((el) => {
                return el.scrollWidth > el.offsetWidth;
            }, title);
        }, {
            timeout: 5000,
            timeoutMsg: 'Title was not truncated even after waiting'
        });

        const isTruncated = await browser.execute((el) => {
            return el.scrollWidth > el.offsetWidth;
        }, title);

        expect(isTruncated).toBe(true);
    });
});
