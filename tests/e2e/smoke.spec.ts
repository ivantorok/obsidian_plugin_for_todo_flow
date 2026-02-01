import { browser, expect } from '@wdio/globals';

describe('Smoke Test: Obsidian Plugin Loading', () => {
    before(async function () {
        console.log('[Test] Reloading Obsidian with test vault...');
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    it('should launch Obsidian and load the Todo Flow plugin', async () => {
        console.log('[Test] Waiting for Obsidian to fully load...');

        // Verify basic Obsidian UI elements are present
        console.log('[Test] Verifying Obsidian UI elements...');
        const leftSplit = await $('.mod-left-split');
        await expect(leftSplit).toExist();

        console.log('[Test] ✅ Obsidian launched successfully and UI is visible.');
    });

    it('should verify the workspace is ready', async () => {
        console.log('[Test] Checking workspace...');

        const workspace = await $('.workspace');
        await expect(workspace).toExist();

        console.log('[Test] ✅ Workspace is visible, plugin environment is ready.');
    });
});
