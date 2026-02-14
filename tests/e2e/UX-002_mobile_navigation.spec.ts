import { browser, expect, $ } from '@wdio/globals';
import { emulateMobile } from './mobile_utils.js';
import { cleanupVault } from './test_utils.js';

describe.skip('UX-002: Mobile Drill-down Back Navigation', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await cleanupVault();
        await emulateMobile();

        // Configure Plugin
        await browser.execute(async () => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            if (plugin) {
                plugin.settings.targetFolder = 'todo-flow';
                plugin.settings.debug = true;
                plugin.settings.lastTray = null; // Clear last tray to force fresh load
                await plugin.saveSettings();
            }
        });
    });

    after(async function () {
        await cleanupVault();
    });

    it('should show back button after drill-down and allow returning to parent', async () => {
        // 1. Setup: Create Parent Task with a sub-task
        // We'll use the LinkParser behavior: Task Parent contains [[Task Child]]
        await browser.execute(async () => {
            const parentContent = `---
task: Parent Task
status: todo
duration: 30
flow_state: shortlist
---
# Parent Task
[[todo-flow/Task-Child.md|Task Child]]
`;
            const childContent = `---
task: Child Task
status: todo
duration: 15
---
# Child Task
`;
            const adapter = app.vault.adapter;
            if (!(await adapter.exists('todo-flow'))) {
                await adapter.mkdir('todo-flow');
            }
            await app.vault.create('todo-flow/Parent-Task.md', parentContent);
            await app.vault.create('todo-flow/Task-Child.md', childContent);
        });

        // Wait for Obsidian to index the new files
        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                const cache1 = app.metadataCache.getCache('todo-flow/Parent-Task.md');
                const cache2 = app.metadataCache.getCache('todo-flow/Task-Child.md');
                // Check if links are resolved too
                const links = app.metadataCache.resolvedLinks['todo-flow/Parent-Task.md'];
                return !!cache1 && !!cache2 && !!links && Object.keys(links).includes('todo-flow/Task-Child.md');
            });
        }, { timeout: 10000, timeoutMsg: 'Metadata cache did not resolve in time' });

        // 2. Open Daily Stack (initially showing Parent Task)
        await browser.execute(() => {
            app.commands.executeCommandById('todo-flow:open-daily-stack');
        });

        // Give Obsidian time to index and plugin to load
        await browser.pause(2000);

        // Diagnostic: Check what tasks are in the view
        const taskInfo = await browser.execute(() => {
            const cards = document.querySelectorAll('.todo-flow-task-card');
            return Array.from(cards).map(c => c.textContent?.trim());
        });
        console.log('[Test UX-002] Visible tasks:', JSON.stringify(taskInfo));

        const parentCard = await $('.todo-flow-task-card');
        await expect(parentCard).toBeDisplayed({ timeout: 5000 });
        await expect(parentCard).toHaveText(expect.stringMatching(/Parent Task/i));

        // 3. Drill down into Parent Task
        // On mobile, drill down is triggered by tapping the card? 
        // handleTap(e, task, i) leads to drillDown if it has children.
        await parentCard.click();
        await browser.pause(1000);

        // 4. Verify we are in the sub-stack (Child Task shown)
        const childCard = await $('.todo-flow-task-card');
        await expect(childCard).toBeDisplayed();
        await expect(childCard).toHaveText(expect.stringMatching(/Child Task/i));

        // 5. Verify Back Button is visible
        const backBtn = await $('.back-nav-btn');
        // REPRODUCTION: We expect this to fail if the button is either missing, invisible, or broken
        await expect(backBtn).toBeDisplayed();

        // 6. Click Back
        await backBtn.click();
        await browser.pause(1000);

        // 7. Verify we are back at Parent Task
        const restoredParentCard = await $('.todo-flow-task-card');
        await expect(restoredParentCard).toBeDisplayed();
        await expect(restoredParentCard).toHaveText(expect.stringMatching(/Parent Task/i));
    });
});
