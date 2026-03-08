import { browser, expect, $, $$ } from '@wdio/globals';
import { emulateMobile } from '../mobile_utils.js';
import { setupStackWithTasks, focusStack } from '../e2e_utils.js';
import { cleanupVault } from '../test_utils.js';

describe('Skip Triage Journey: BUG-025 bulk shortlist', () => {

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

    it('should shortlist all remaining items when "Skip All" is tapped', async () => {
        // --- STEP 1: Setup multiple triage items manually ---
        console.log('[Journey] Step 1: Setting up items for triage');

        // Clean up
        await browser.execute(async () => {
            // @ts-ignore
            const rootFiles = app.vault.getMarkdownFiles();
            for (const file of rootFiles) {
                // @ts-ignore
                try { await app.vault.delete(file); } catch (e) { }
            }
        });

        // Open Dump
        await browser.execute(() => {
            // @ts-ignore
            app.commands.executeCommandById('todo-flow:open-todo-dump');
        });

        const dumpInput = await $('textarea.todo-flow-dump-input');
        await dumpInput.waitForDisplayed({ timeout: 10000 });

        // Add 3 tasks
        const tasks = ['Task 1', 'Task 2', 'Task 3'];
        for (const t of tasks) {
            await dumpInput.setValue(t);
            await browser.keys(['Enter']);
            await browser.pause(500);
        }

        // Submit to Triage
        await dumpInput.setValue('done');
        await browser.keys(['Enter']);

        // Wait for Triage
        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getLeavesOfType('todo-flow-triage-view').length > 0;
            });
        }, { timeout: 10000 });

        const triageContainer = await $('.todo-flow-triage-container');
        await triageContainer.waitForDisplayed({ timeout: 10000 });

        // Verify first task
        const firstCardTitle = await $('.todo-flow-card-header');
        await firstCardTitle.waitForDisplayed({ timeout: 10000 });
        expect(await firstCardTitle.getText()).toBe('TASK 1');

        // --- STEP 2: Trigger Shortlist All ---
        console.log('[Journey] Step 2: Clicking Shortlist All');
        const shortlistAllBtn = await $('.tf-shortlist-all-btn');
        await shortlistAllBtn.waitForExist({ timeout: 10000 });
        await shortlistAllBtn.click();

        // --- STEP 3: Verify Stack View (No conflict expected as we cleaned up) ---
        console.log('[Journey] Step 3: Verifying transition to stack');

        await browser.waitUntil(async () => {
            return (await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getLeavesOfType('todo-flow-stack-view').length > 0;
            }));
        }, { timeout: 15000, timeoutMsg: 'Stack View should appear after Skip All' });

        const stackContainer = await $('.todo-flow-stack-container');
        await stackContainer.waitForDisplayed({ timeout: 10000 });

        // Verify we have tasks in the stack
        const stackTasks = await $$('.todo-flow-task-card .focus-title');
        expect(stackTasks.length).toBeGreaterThanOrEqual(1);

        console.log('[Journey] ✅ Skip Triage Journey completed successfully');
    });
});
