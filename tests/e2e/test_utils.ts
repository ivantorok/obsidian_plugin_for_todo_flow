import { browser } from '@wdio/globals';

/**
 * Clean up the vault by removing all files in the todo-flow directory.
 * This should be called in afterEach hooks to prevent state pollution between tests.
 */
export async function cleanupVault() {
    await browser.execute(async () => {
        const adapter = app.vault.adapter;
        const todoFlowDir = 'todo-flow';

        // 1. Remove all files in todo-flow directory
        if (await adapter.exists(todoFlowDir)) {
            const listing = await adapter.list(todoFlowDir);
            for (const file of listing.files) {
                try {
                    await adapter.remove(file);
                } catch (e) { }
            }
        }

        // 2. Remove all markdown files in root (including CurrentStack.md)
        const rootListing = await adapter.list('');
        for (const file of rootListing.files) {
            if (file.endsWith('.md')) {
                try {
                    await adapter.remove(file);
                } catch (e) { }
            }
        }
    });
}
