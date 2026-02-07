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
        // 1. Create a fresh dump task directly
        await browser.execute(async () => {
            const content = `---
task: Triage Test Task
status: todo
duration: 30
flow_state: dump
---
# Triage Test Task
`;
            const adapter = app.vault.adapter;
            if (!(await adapter.exists('todo-flow'))) {
                await adapter.mkdir('todo-flow');
            }
            await app.vault.create('todo-flow/TriageTestTask.md', content);
        });
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
    });
});
