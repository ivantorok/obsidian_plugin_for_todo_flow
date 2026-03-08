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
        const shortlistBtn = await $('button=Shortlist →');
        await expect(shortlistBtn).toBeDisplayed();
        const idleColor = await shortlistBtn.getCSSProperty('background-color');
        console.log('[DEBUG] Idle Color:', idleColor.value);

        // 4. Click the button
        await browser.execute((el) => (el as HTMLElement).click(), shortlistBtn);

        // 5. Wait for the triage animation to complete and verify color resets
        // Use waitUntil to poll until the button returns to idle color
        await browser.waitUntil(async () => {
            const currentColor = await shortlistBtn.getCSSProperty('background-color');
            return currentColor.value === idleColor.value;
        }, {
            timeout: 3000,
            interval: 100,
            timeoutMsg: `Button color did not reset to idle state (${idleColor.value})`
        });

        // 6. Final assertion — the button should be in its idle visual state
        const finalColor = await shortlistBtn.getCSSProperty('background-color');
        console.log('[DEBUG] Final Color:', finalColor.value);
        expect(finalColor.value).toBe(idleColor.value);
    });
});
