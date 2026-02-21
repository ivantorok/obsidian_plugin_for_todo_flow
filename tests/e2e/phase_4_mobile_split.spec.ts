import { browser, expect, $ } from '@wdio/globals';
import { emulateMobile } from './mobile_utils.js';
import { setupStackWithTasks, focusStack } from './e2e_utils.js';

describe('Phase 4: Skeptical Specs - Mobile Structural Split', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        // Emulate mobile first so plugin and views initialize with isMobile=true
        await emulateMobile();
        // Create real file-backed tasks via Dump → Triage → Stack flow
        await setupStackWithTasks(['Focus Task A']);
        await focusStack();
    });

    it('should use the "FocusStack" component on mobile and exclude desktop logic', async () => {
        // Wait for the container to be ready and in focus mode (mobile default)
        const container = await $('.todo-flow-stack-container');
        await browser.waitUntil(async () => {
            const ready = await container.getAttribute('data-ui-ready');
            const mode = await container.getAttribute('data-view-mode');
            return ready === 'true' && mode === 'focus';
        }, { timeout: 10000, timeoutMsg: 'Stack container did not reach focus mode on mobile' });

        // 1. Check for Focus component marker (data-view-type="focus" on FocusStack container)
        const focusContainer = await $('[data-view-type="focus"]');
        await focusContainer.waitForExist({ timeout: 5000 });
        expect(await focusContainer.isExisting()).toBe(true);

        // 2. Focus card renders for tasks
        const focusCard = await $('[data-testid="focus-card"]');
        await focusCard.waitForDisplayed({ timeout: 5000 });
        expect(await focusCard.isDisplayed()).toBe(true);

        // 3. FocusStack does NOT render drag handles (architect/desktop-only feature)
        const dragHandle = await $('.drag-handle');
        expect(await dragHandle.isExisting()).toBe(false);

        // 4. FocusStack shows .index-display (e.g., "#1 of 1")
        const indexDisplay = await $('.index-display');
        await indexDisplay.waitForExist({ timeout: 5000 });
        expect(await indexDisplay.isExisting()).toBe(true);
    });
});
