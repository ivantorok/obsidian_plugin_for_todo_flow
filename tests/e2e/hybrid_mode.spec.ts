import { browser, expect, $ } from '@wdio/globals';
import { emulateMobile } from './mobile_utils.js';

describe('Phase 1: Hybrid Mode [SKEPTICAL SPEC]', () => {
    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await emulateMobile();
    });

    it('should toggle between Focus and Architect modes', async () => {
        // 1. Open the Daily Stack
        await browser.execute(() => {
            // @ts-ignore
            app.commands.executeCommandById('todo-flow:open-daily-stack');
        });
        // @ts-ignore
        await browser.pause(3000);

        // Debug: Capture screenshot
        await browser.saveScreenshot('./tests/e2e/screenshots/hybrid_mode_initial.png');

        // 2. Verify we are in Focus mode by default on mobile
        // Try class selector as fallback
        const container = await $('.todo-flow-stack-container');
        await container.waitForDisplayed({ timeout: 10000 });

        // Wait for Svelte component to be ready and in focus mode
        await browser.waitUntil(async () => {
            const ready = await container.getAttribute('data-ui-ready');
            const mode = await container.getAttribute('data-view-mode');
            return ready === 'true' && mode === 'focus';
        }, { timeout: 10000, timeoutMsg: 'StackView UI not ready or not in focus mode' });

        const focusCard = await $('[data-testid="focus-card"]');
        await expect(focusCard).toBeDisplayed();

        // 3. Toggle to Architect mode
        const toggleBtn = await $('.mode-toggle-btn');
        await toggleBtn.click();
        // @ts-ignore
        await browser.pause(1000);
        await browser.saveScreenshot('./tests/e2e/screenshots/hybrid_mode_architect.png');

        // 4. Verify Architect mode via DOM attributes
        await expect(container).toHaveAttribute('data-view-mode', 'architect');
        await expect(focusCard).not.toBeDisplayed();

        const taskCard = await $('[data-testid="task-card-0"]');
        await expect(taskCard).toBeDisplayed();

        // 5. Toggle back to Focus mode
        await toggleBtn.click();
        // @ts-ignore
        await browser.pause(1000);
        await expect(container).toHaveAttribute('data-view-mode', 'focus');
        await expect(focusCard).toBeDisplayed();
    });
});
