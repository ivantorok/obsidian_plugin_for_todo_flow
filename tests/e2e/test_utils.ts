import { browser } from '@wdio/globals';

/**
 * Clean up the vault by removing all files in the todo-flow directory.
 * This should be called in afterEach hooks to prevent state pollution between tests.
 */
export async function cleanupVault() {
    await browser.execute(async () => {
        const adapter = app.vault.adapter;

        // 1. Get all files and folders in root
        const rootListing = await adapter.list('');

        // 2. Remove all files in root (except hidden ones if any)
        for (const file of rootListing.files) {
            if (file.startsWith('.')) continue; // Keep .obsidian-cache or similar if needed
            try {
                await adapter.remove(file);
            } catch (e) { }
        }

        // 3. Remove all folders in root (except .obsidian and .obsidian-cache)
        for (const folder of rootListing.folders) {
            if (folder === '.obsidian' || folder === '.obsidian-cache') continue;
            try {
                await adapter.rmdir(folder, true);
            } catch (e) { }
        }
    });
}
