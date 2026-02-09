import { browser, expect, $ } from '@wdio/globals';
import { emulateMobile } from '../mobile_utils.js';
import { setupStackWithTasks, focusStack } from '../e2e_utils.js';
import { cleanupVault } from '../test_utils.js';

describe('Mobile Start Time Discovery (UX-001)', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await emulateMobile();

        // Configure Plugin
        await browser.execute(async () => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            if (plugin) {
                plugin.settings.targetFolder = 'todo-flow';
                plugin.settings.debug = true;
                await plugin.saveSettings();
            }
        });
    });

    after(async function () {
        await cleanupVault();
    });

    it('should show an edit indicator and trigger start time editing on click', async () => {
        // Step 1: Setup Task A
        await setupStackWithTasks(['Task A']);
        await focusStack();

        const taskCard = await $('.todo-flow-task-card*=Task A');
        await taskCard.waitForExist({ timeout: 10000 });

        // Step 2: Verify time-col has a pointer cursor (indicates interactivity)
        const timeCol = await taskCard.$('.time-col');
        const cursor = await timeCol.getCSSProperty('cursor');
        // This will fail initially as it's not set
        expect(cursor.value).toBe('pointer');

        // Step 3: Verify existence of edit icon (SVG) inside time-col
        const editIcon = await timeCol.$('svg.edit-icon');
        await editIcon.waitForExist({ timeout: 5000 });
        expect(await editIcon.isDisplayed()).toBe(true);

        // Step 4: Click the time column to trigger edit mode
        await timeCol.click();

        // Step 5: Verify that the time input appears
        const timeInput = await taskCard.$('.todo-flow-time-input');
        await timeInput.waitForDisplayed({ timeout: 5000 });
        expect(await timeInput.isDisplayed()).toBe(true);
    });
});
