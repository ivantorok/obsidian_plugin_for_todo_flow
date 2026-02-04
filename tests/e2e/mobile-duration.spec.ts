import { browser, expect, $ } from '@wdio/globals';
import { emulateMobile } from './mobile_utils.js';
import { setupStackWithTasks, focusStack } from './e2e_utils.js';

describe('Mobile: Smart Duration Sequence', () => {

    beforeEach(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await emulateMobile();

        // 1. Configure Plugin
        await browser.execute(async () => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            if (plugin) {
                plugin.settings.targetFolder = 'todo-flow';
                await plugin.saveSettings();
            }
        });

        // 2. Setup task via official flow (Dump -> Triage -> Stack)
        await setupStackWithTasks(['Duration Test Task']);
        await focusStack();
    });

    it('should scale duration correctly through the human planning sequence', async () => {
        // Find the task card (wait for it to settle)
        const taskCard = await $(`.todo-flow-task-card*=${'Duration Test Task'}`);
        await taskCard.waitForDisplayed({ timeout: 10000 });

        // Verify start at 30m
        const getDurationText = async () => {
            const el = await taskCard.$('.duration-text');
            await el.waitForDisplayed({ timeout: 5000 });
            return await el.getText();
        };

        expect(await getDurationText()).toBe('30m');

        // Click Plus button
        const plusBtn = await taskCard.$('.duration-btn.plus');
        await plusBtn.click();
        await browser.pause(500);
        expect(await getDurationText()).toBe('45m');

        // Click Plus again
        await plusBtn.click();
        await browser.pause(500);
        expect(await getDurationText()).toBe('1h');

        // Click Minus
        const minusBtn = await taskCard.$('.duration-btn.minus');
        await minusBtn.click();
        await browser.pause(500);
        expect(await getDurationText()).toBe('45m');

        // Verify redundant buttons are GONE
        const smallPlus = await taskCard.$('.duration-btn.plus.small');
        expect(await smallPlus.isExisting()).toBe(false);
        const smallMinus = await taskCard.$('.duration-btn.minus.small');
        expect(await smallMinus.isExisting()).toBe(false);

        console.log('[Test] ✅ Smart Duration Sequence verified successfully');
    });
});
