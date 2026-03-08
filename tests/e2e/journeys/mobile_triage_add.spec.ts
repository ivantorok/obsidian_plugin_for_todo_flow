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
        await browser.waitUntil(async () => {
            return await browser.execute(async () => {
                const files = app.vault.getMarkdownFiles();
                for (const f of files) {
                    const cache = app.metadataCache.getCache(f.path);
                    if (cache?.frontmatter?.task === 'Mobile added task') return true;
                    if (f.name.toLowerCase().includes('mobile-added-task')) return true;
                    const content = await app.vault.read(f);
                    if (content.includes('Mobile added task')) return true;
                }
                return false;
            });
        }, {
            timeout: 5000,
            timeoutMsg: 'Task "Mobile added task" did not appear in vault'
        });

        // 6. Verify task appears in the Triage UI (Task Card)
        console.log('[Test] Verifying UI update - Step 6');

        // Initial Card check — use waitUntil for the card to settle
        await browser.waitUntil(async () => {
            const titleEl = await $('.todo-flow-card .todo-flow-card-header');
            if (!await titleEl.isDisplayed()) return false;
            const text = await titleEl.getText();
            return text.length > 0;
        }, {
            timeout: 3000,
            timeoutMsg: 'Initial triage card did not appear'
        });

        const initialTitleEl = await $('.todo-flow-card .todo-flow-card-header');
        const initialTitle = await initialTitleEl.getText();
        console.log(`[Test] Initial Card Title: "${initialTitle}"`);
        await expect(initialTitleEl).toHaveText('TASK A');

        // Click the shortlist button instead of using flaky dragAndDrop
        console.log('[Test] Clicking Shortlist button...');
        const shortlistBtn = await $('button=Shortlist →');
        await expect(shortlistBtn).toBeDisplayed();
        await browser.execute((el: any) => (el as HTMLElement).click(), shortlistBtn);

        // Wait for the next card to appear via waitUntil
        await browser.waitUntil(async () => {
            const titleEl = await $('.todo-flow-card .todo-flow-card-header');
            if (!await titleEl.isDisplayed()) return false;
            const text = await titleEl.getText();
            return text === 'MOBILE ADDED TASK';
        }, {
            timeout: 5000,
            interval: 300,
            timeoutMsg: 'New card "MOBILE ADDED TASK" did not appear after shortlisting'
        });

        const newCardTitle = await $('.todo-flow-card .todo-flow-card-header');
        await expect(newCardTitle).toHaveText('MOBILE ADDED TASK');
    });
});
