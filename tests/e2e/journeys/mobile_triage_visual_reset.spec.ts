import { browser, expect, $ } from '@wdio/globals';
import { emulateMobile } from '../mobile_utils.js';
import { cleanupVault } from '../test_utils.js';

describe('Mobile Triage Visual Reset (BUG-014)', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await emulateMobile();
    });

    after(async function () {
        await cleanupVault();
    });

    it('should reset button visual state immediately after click in Triage View', async () => {
        // 1. Create two tasks
        await browser.execute(async () => {
            const tasks = [
                { name: 'VisualTask1.md', content: '---\ntask: Visual Task 1\nflow_state: dump\n---\n# Visual Task 1' },
                { name: 'VisualTask2.md', content: '---\ntask: Visual Task 2\nflow_state: dump\n---\n# Visual Task 2' }
            ];
            const adapter = app.vault.adapter;
            if (!(await adapter.exists('todo-flow'))) {
                await adapter.mkdir('todo-flow');
            }
            for (const t of tasks) {
                await app.vault.create(`todo-flow/${t.name}`, t.content);
            }
        });
        await browser.pause(500);

        // 2. Start Triage
        await browser.execute(() => {
            app.commands.executeCommandById('todo-flow:start-triage');
        });
        await browser.pause(1000);

        // 3. Capture the idle background color of the shortlist button
        const shortlistBtn = await $('.shortlist');
        await expect(shortlistBtn).toBeDisplayed();
        const idleColor = await shortlistBtn.getCSSProperty('background-color');
        console.log('[DEBUG] Idle Color:', idleColor.value);

        // 4. Click the button using native script
        await browser.execute((el) => (el as HTMLElement).click(), shortlistBtn);

        // 5. Check color after a short delay (shorter than the 200ms slide animation)
        await browser.pause(100);

        // We check the color of the selector again. 
        // Note: The card might be animating away, but the button element might still be queried
        // or we check the color of the element that is now supposedly "reset" or the new one.
        // Actually, we want to ensure NO button has the "active" color.

        const currentColor = await shortlistBtn.getCSSProperty('background-color');
        console.log('[DEBUG] Color after click (100ms):', currentColor.value);

        // If the bug exists, currentColor will likely be different from idleColor 
        // (representing the :active or :focus state color).
        // Since we are moving to manual state management, we expect color to be back to idle.
        expect(currentColor.value).toBe(idleColor.value);
    });
});
