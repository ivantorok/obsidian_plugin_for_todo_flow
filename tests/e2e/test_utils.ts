import { browser } from '@wdio/globals';

/**
 * Clean up the vault by removing all files in the todo-flow directory.
 * This should be called in afterEach hooks to prevent state pollution between tests.
 */
export async function cleanupVault() {
    await browser.execute(async () => {
        const adapter = app.vault.adapter;
        const todoFlowDir = 'todo-flow';

        // Remove all files in todo-flow directory
        if (await adapter.exists(todoFlowDir)) {
            const listing = await adapter.list(todoFlowDir);

            // Delete all files
            for (const file of listing.files) {
                try {
                    await adapter.remove(file);
                } catch (e) {
                    console.warn(`Failed to remove ${file}:`, e);
                }
            }
        }
    });
}
