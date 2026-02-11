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
        const plusBtn = await $('.plus-btn');
        await expect(plusBtn).toBeDisplayed();
        await browser.execute((el) => (el as HTMLElement).click(), plusBtn);
        await browser.pause(1000);

        // 4. Verify QuickAddModal is open and add a task
        const promptInput = await $('.prompt-input');
        await expect(promptInput).toBeDisplayed();
        await promptInput.setValue('Mobile added task');

        const suggestionItem = await $('.suggestion-item');
        await suggestionItem.waitForDisplayed({ timeout: 5000 });
        await suggestionItem.click();
        await browser.pause(500);

        // 5. Verify task was created in the vault
        const taskFileExists = await browser.execute(async () => {
            const files = app.vault.getMarkdownFiles();
            return files.some((f: any) => {
                const cache = app.metadataCache.getCache(f.path);
                return cache?.frontmatter?.task === 'Mobile added task';
            });
        });
        expect(taskFileExists).toBe(true);

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

