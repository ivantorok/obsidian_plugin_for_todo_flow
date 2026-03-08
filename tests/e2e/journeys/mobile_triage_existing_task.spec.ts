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
        const plusBtn = await $('.todo-flow-triage-container .plus-btn');
        await expect(plusBtn).toBeDisplayed();
        await browser.execute((el: any) => (el as HTMLElement).click(), plusBtn);
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

        // 8. Verify task was added by clicking the Shortlist button (deterministic, no drag)
        // Using button click instead of dragAndDrop to avoid WDIO gesture flakiness
        const shortlistBtn = await $('button=Shortlist →');
        await expect(shortlistBtn).toBeDisplayed();
        await browser.execute((el: any) => (el as HTMLElement).click(), shortlistBtn);

        // 9. The triage container should still be displayed with the added task
        // Use waitUntil to allow the transition animation to complete
        await browser.waitUntil(async () => {
            const container = await $('.todo-flow-triage-container');
            const isDisplayed = await container.isDisplayed();
            if (!isDisplayed) return false;
            const text = await container.getText();
            return /BACKLOGTASKTOADD/i.test(text);
        }, {
            timeout: 5000,
            interval: 300,
            timeoutMsg: 'Triage container did not show BACKLOGTASKTOADD after shortlisting initial task'
        });

        // 10. Verify disk persistence with waitUntil polling (BUG-012)
        const persistenceCheck = await browser.waitUntil(async () => {
            return await browser.execute(async () => {
                const path = 'todo-flow/BacklogTaskToAdd.md';
                // @ts-ignore
                const file = app.vault.getAbstractFileByPath(path);
                if (file) {
                    // @ts-ignore
                    const content = await app.vault.read(file);
                    if (content.includes('flow_state: dump')) return true;
                }
                return false;
            });
        }, {
            timeout: 10000,
            interval: 500,
            timeoutMsg: 'Disk persistence check failed: flow_state not updated to dump'
        });

        expect(persistenceCheck).toBe(true);
    });
});
