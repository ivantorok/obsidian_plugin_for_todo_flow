import { browser } from '@wdio/globals';

describe('Manual Open', () => {
    it('should keep Obsidian open for manual testing', async () => {
        // Reload obsidian to ensure vault is loaded (handled by service, but good to be explicit if needed)
        // Service should handle 'vault' capability.

        console.log('[Manual Open] Obsidian launched via WebdriverIO.');
        console.log('[Manual Open] Session will remain open for 1 hour or until you press Ctrl+C.');

        // Keep the session open
        await new Promise(resolve => setTimeout(resolve, 3600000));
    });
});
