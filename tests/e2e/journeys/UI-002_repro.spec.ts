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
        const longTitle = 'LongTitle_'.repeat(20); // 200 characters

        await setupStackWithTasks([longTitle]);
        await focusStack();

        const card = await $('.todo-flow-task-card');
        await card.waitForExist({ timeout: 10000 });

        const title = await card.$('.title');

        // Check if text is actually truncated (scrollWidth > offsetWidth)
        const isTruncated = await browser.execute((el) => {
            return el.scrollWidth > el.offsetWidth;
        }, title);

        expect(isTruncated).toBe(true);
    });
});
