import { browser, expect, $, $$ } from '@wdio/globals';
import { emulateMobile } from '../mobile_utils.js';
import { setupStackWithTasks, focusStack } from '../e2e_utils.js';
import { cleanupVault } from '../test_utils.js';

describe('Mobile Full Journey: The Day of a User', () => {

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
            // @ts-ignore
            const palette = app.internalPlugins?.getPluginById('command-palette');
            if (palette && !palette.enabled) await palette.enable();
        });
    });

    after(async function () {
        await cleanupVault();
    });

    it('should complete a single-task lifecycle on mobile', async () => {
        // --- STEP 1: Add Task A via Dump Flow ---
        console.log('[Journey] Step 1: Adding Task A via Dump');
        await setupStackWithTasks(['Task A']);
        await focusStack();

        const taskACard = await $('.todo-flow-task-card*=Task A');
        await taskACard.waitForExist({ timeout: 10000 });

        const durationText = await taskACard.$('.duration-text');
        expect(await durationText.getText()).toBe('30m');

        // --- STEP 2: Scale Task A Duration (30m -> 1h) ---
        console.log('[Journey] Step 2: Scaling Task A');
        const plusBtn = await taskACard.$('.duration-btn.plus');
        // Click twice: 30m -> 45m -> 1h
        await browser.execute((el) => (el as HTMLElement).click(), plusBtn);
        await browser.pause(300);
        await browser.execute((el) => (el as HTMLElement).click(), plusBtn);
        await browser.pause(300);
        expect(await durationText.getText()).toBe('1h');

        // --- STEP 3: Archive Task A ---
        console.log('[Journey] Step 3: Archiving Task A');
        await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            view.component.setFocus(0);
            const container = document.querySelector('.todo-flow-stack-container') as HTMLElement;
            if (container) container.focus();
        });
        await browser.pause(500);
        // @ts-ignore
        await browser.keys(['z']);
        await browser.pause(2000);

        // --- STEP 4: Final Verification ---
        console.log('[Journey] Step 4: Final Verification');
        const finalCards = await $$('.todo-flow-task-card');
        expect(finalCards.length).toBe(0);

        console.log('[Journey] ✅ Mobile Lifecycle Journey completed successfully');
    });
});
