import { browser, expect, $ } from '@wdio/globals';
import { emulateMobile } from '../mobile_utils.js';
import { cleanupVault } from '../test_utils.js';

describe('Mobile Triage Addition (FEAT-001)', () => {

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
                await plugin.saveSettings();
            }
        });
    });

    after(async function () {
        await cleanupVault();
    });

    it('should allow adding tasks via a floating "+" button on mobile triage', async () => {
        // 1. Scaffold Vault (Steady State)
        // @ts-ignore
        const { scaffoldVault } = await import('../e2e_utils.js');
        await scaffoldVault('basic_stack');
        await browser.pause(500);

        // 2. Start Triage
        await browser.execute(() => {
            app.commands.executeCommandById('todo-flow:start-triage');
        });
        await browser.pause(1000);

        // 3. Click the plus button to open QuickAddModal
        const plusBtn = await $('.todo-flow-triage-container .plus-btn');
        await expect(plusBtn).toBeDisplayed();
        await browser.execute((el: any) => (el as HTMLElement).click(), plusBtn);
        await browser.pause(1000);

        // 4. Verify QuickAddModal is open and add a task
        const promptInput = await $('.prompt-input');
        await expect(promptInput).toBeDisplayed();
        await promptInput.setValue('Mobile added task');

        const suggestionItem = await $('.todo-flow-new-item');
        await suggestionItem.waitForDisplayed({ timeout: 5000 });
        await suggestionItem.click();
        await browser.pause(500);

        // 5. Verify task was created in the vault (with robust polling)
        const vaultState = await browser.waitUntil(async () => {
            return await browser.execute(async () => {
                const files = app.vault.getMarkdownFiles();
                const fileNames = files.map(f => f.name);

                for (const f of files) {
                    const cache = app.metadataCache.getCache(f.path);
                    if (cache?.frontmatter?.task === 'Mobile added task') return { success: true, files: fileNames };
                    if (f.name.toLowerCase().includes('mobile-added-task')) return { success: true, files: fileNames };

                    const content = await app.vault.read(f);
                    if (content.includes('Mobile added task')) return { success: true, files: fileNames };
                }

                // Return false to keep polling, but we want the names for the timeout message
                // In webdriverIO, if we return false it polls. If we return an object it passes.
                // So we can only return truthy when found.
                return false;
            });
        }, {
            timeout: 5000,
            timeoutMsg: 'Task "Mobile added task" did not appear. Vault contents unknown.'
        }).catch(async (e) => {
            // On timeout, grab the final file list
            const finalFiles = await browser.execute(() => app.vault.getMarkdownFiles().map(f => f.name));
            throw new Error(`Task "Mobile added task" did not appear. Final vault files: ${finalFiles.join(', ')}`);
        });

        // 6. Verify task appears in the Triage UI (Task Card)
        console.log('[Test] Verifying UI update - Step 6');

        // Wait for potential animation/update
        await browser.pause(1000);

        // Initial Card check
        const initialTitleEl = await $('.todo-flow-card .todo-flow-card-header');
        const initialTitle = await initialTitleEl.getText();
        console.log(`[Test] Initial Card Title: "${initialTitle}"`);
        await expect(initialTitleEl).toHaveText('TASK A');

        // Swipe away the current task ("Triage Test Task")
        console.log('[Test] Swiping right...');
        const card = await $('.triage-card-wrapper');
        await card.dragAndDrop({ x: 200, y: 0 }); // Swipe right

        // Wait for debounce (200ms) + animation (200ms) + safety
        await browser.pause(1500);

        // Now the new task should be visible
        console.log('[Test] Checking for new card...');
        const newCardTitle = await $('.todo-flow-card .todo-flow-card-header');
        const newTitle = await newCardTitle.getText();
        console.log(`[Test] New Card Title: "${newTitle}"`);

        await expect(newCardTitle).toHaveText('MOBILE ADDED TASK');
    });
});

