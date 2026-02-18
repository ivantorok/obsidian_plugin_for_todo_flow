import { browser, expect, $ } from '@wdio/globals';
import { emulateMobile } from '../mobile_utils.js';
import { cleanupVault } from '../test_utils.js';

describe('Mobile Triage Existing Task Selection (BUG-012)', () => {

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
                if (plugin.logger) plugin.logger.setEnabled(true);
                await plugin.saveSettings();
            }
        });
    });

    beforeEach(async function () {
        await cleanupVault();
    });

    //    after(async function () {
    //        await cleanupVault();
    //    });

    it('should add existing task to triage queue when selected via FAB', async () => {
        // 1. Create a dump task that will be in triage initially
        await browser.execute(async () => {
            const content = `---
task: Initial Triage Task
status: todo
duration: 30
flow_state: dump
---
# Initial Triage Task
`;
            const adapter = app.vault.adapter;
            if (!(await adapter.exists('todo-flow'))) {
                await adapter.mkdir('todo-flow');
            }
            await app.vault.create('todo-flow/InitialTriageTask.md', content);
        });
        await browser.pause(500);

        // 2. Create a BACKLOG task (not dump) that we will select via FAB
        // This task is NOT in the triage pool initially
        await browser.execute(async () => {
            const content = `---
task: Backlog Task To Add
status: todo
duration: 15
flow_state: backlog
---
# Backlog Task To Add
`;
            await app.vault.create('todo-flow/BacklogTaskToAdd.md', content);
        });
        await browser.pause(500);

        // 3. Start Triage (only "Initial Triage Task" should be in queue)
        await browser.execute(() => {
            app.commands.executeCommandById('todo-flow:start-triage');
        });
        await browser.pause(1000);

        // 4. Verify triage view is shown
        const triageContainer = await $('.todo-flow-triage-container');
        await expect(triageContainer).toBeDisplayed();

        // 5. Click the plus button to open QuickAddModal
        const plusBtn = await $('.plus-btn');
        await expect(plusBtn).toBeDisplayed();
        await browser.execute((el) => (el as HTMLElement).click(), plusBtn);
        await browser.pause(1000);

        // 6. Type exact file name to get it as first suggestion
        const promptInput = await $('.prompt-input');
        await expect(promptInput).toBeDisplayed();
        await promptInput.setValue('todo-flow/BacklogTaskToAdd');
        await browser.pause(500);

        // 7. Click the first suggestion - should be the file match
        const suggestionItem = await $('.suggestion-item');
        await suggestionItem.waitForDisplayed({ timeout: 5000 });
        await suggestionItem.click();
        await browser.pause(1000);

        // 8. Verify task was added by checking the triage queue length
        // After adding, we should have 2 tasks in queue (initial + added)
        // Swipe to move past the initial task
        const shortlistBtn = await $('.shortlist');
        await expect(shortlistBtn).toBeDisplayed();
        await shortlistBtn.click();

        // 9. The triage container should still be displayed with the added task
        // (If the task wasn't added, the view would close after swiping the only task)
        const updatedContainer = await $('.todo-flow-triage-container');
        await expect(updatedContainer).toBeDisplayed();

        // Hardened: using async matcher with built-in retries to avoid flakiness under load
        await expect(updatedContainer).toHaveText(expect.stringMatching(/BACKLOGTASKTOADD/i));

        // 10. Verify disk persistence with retries (BUG-012)
        const persistenceCheck = await browser.execute(async () => {
            const path = 'todo-flow/BacklogTaskToAdd.md';
            const maxRetries = 10;
            const delay = 500;

            for (let i = 0; i < maxRetries; i++) {
                // @ts-ignore
                const file = app.vault.getAbstractFileByPath(path);
                if (file) {
                    // @ts-ignore
                    const content = await app.vault.read(file);
                    if (content.includes('flow_state: dump')) return 'SUCCESS';
                }
                await new Promise(r => setTimeout(r, delay));
            }

            // Final check output for debugging if it failed
            // @ts-ignore
            const file = app.vault.getAbstractFileByPath(path);
            const finalContent = file ? await app.vault.read(file) : 'FILE_NOT_FOUND';
            return `FAILURE: ${finalContent}`;
        });
        await expect(persistenceCheck).toBe('SUCCESS');
    });
});
