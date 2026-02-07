import { browser, expect, $ } from '@wdio/globals';
import { emulateMobile } from '../mobile_utils.js';
import { setupStackWithTasks } from '../e2e_utils.js';
import { cleanupVault } from '../test_utils.js';

describe.skip('Mobile Triage Addition (FEAT-001)', () => {

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

    it('should allow adding tasks via a floating "+" button on mobile triage', async () => {
        // 1. Setup tasks and enter Triage
        console.log('[Test FEAT-001] Step 1: Entering Triage');
        // We add dummy tasks to trigger Triage flow
        await setupStackWithTasks(['Dummy 1']);

        // Re-open Triage if we are in Stack or just stay in Triage if setupStackWithTasks leaves us there
        // Actually setupStackWithTasks ends in Stack. We need to go BACK to Triage or just start a new session.
        await browser.execute(() => {
            // @ts-ignore
            app.commands.executeCommandById('todo-flow:start-triage');
        });
        await browser.pause(1000);

        // 2. Look for the plus button
        console.log('[Test FEAT-001] Step 2: Looking for the "+" button');
        const plusBtn = await $('.plus-btn');

        // EXPECTATION: The button should be displayed
        // This will FAIL initially because we haven't added it to TriageView.svelte
        await expect(plusBtn).toBeDisplayed();

        // 3. Click the button
        console.log('[Test FEAT-001] Step 3: Clicking "+" button');
        await browser.execute((el) => (el as HTMLElement).click(), plusBtn);
        await browser.pause(1000);

        // 4. Verify QuickAddModal is open
        const modalInput = await $('.prompt-input');
        await expect(modalInput).toBeDisplayed();

        // 5. Add a task
        console.log('[Test FEAT-001] Step 4: Adding a task via modal');
        await browser.keys(['Mobile added task', 'Enter']);
        await browser.pause(1000);

        // 6. Verify it's in the triage queue
        const triageTasks = await browser.execute(() => {
            // @ts-ignore
            const triageView = app.workspace.getLeavesOfType('todo-flow-triage-view')[0].view;
            return triageView.component.tasks.map(t => t.title);
        });

        console.log('[Test FEAT-001] Triage Tasks:', triageTasks);
        expect(triageTasks).toContain('Mobile added task');
    });
});
