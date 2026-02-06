import { browser, expect, $, $$ } from '@wdio/globals';
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
        // Helper to get duration text
        const getDurationText = async () => {
            const card = await $(`.todo-flow-task-card*=${'Duration Test Task'}`);
            await card.waitForExist({ timeout: 10000 });
            const el = await card.$('.duration-text');
            await el.waitForDisplayed({ timeout: 10000 });
            return await el.getText();
        };

        const getPlusBtn = async () => {
            const card = await $(`.todo-flow-task-card*=${'Duration Test Task'}`);
            return await card.$('.duration-btn.plus');
        };

        const getMinusBtn = async () => {
            const card = await $(`.todo-flow-task-card*=${'Duration Test Task'}`);
            return await card.$('.duration-btn.minus');
        };

        const clickBtn = async (btn: any) => {
            await browser.execute((el) => (el as HTMLElement).click(), btn);
        };

        // Verify start at 30m
        expect(await getDurationText()).toBe('30m');

        // 1. Scale Up: 30m -> 45m
        await clickBtn(await getPlusBtn());
        await browser.pause(500);
        expect(await getDurationText()).toBe('45m');

        // 2. Scale Up: 45m -> 1h
        await clickBtn(await getPlusBtn());
        await browser.pause(500);
        expect(await getDurationText()).toBe('1h');

        // 3. Scale Down: 1h -> 45m
        await clickBtn(await getMinusBtn());
        await browser.pause(500);
        expect(await getDurationText()).toBe('45m');

        // 4. Sequence Down to 2m
        // Sequence: 45m -> 30m -> 20m -> 15m -> 10m -> 5m -> 2m (6 clicks)
        const expectedSequenceDown = ['30m', '20m', '15m', '10m', '5m', '2m'];
        for (const expected of expectedSequenceDown) {
            await clickBtn(await getMinusBtn());
            await browser.pause(300);
            expect(await getDurationText()).toBe(expected);
        }

        // 5. Scale back up from 2m -> 5m
        await clickBtn(await getPlusBtn());
        await browser.pause(300);
        expect(await getDurationText()).toBe('5m');

        // Verify redundant small buttons are GONE
        const taskCard = await $(`.todo-flow-task-card*=${'Duration Test Task'}`);
        const smallPlus = await taskCard.$('.duration-btn.plus.small');
        expect(await smallPlus.isExisting()).toBe(false);
        const smallMinus = await taskCard.$('.duration-btn.minus.small');
        expect(await smallMinus.isExisting()).toBe(false);

        console.log('[Test] ✅ Smart Duration Sequence verified successfully');
    });
});
