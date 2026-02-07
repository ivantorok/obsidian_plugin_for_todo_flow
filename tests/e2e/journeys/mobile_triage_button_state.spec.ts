import { browser, expect, $ } from '@wdio/globals';
import { emulateMobile } from '../mobile_utils.js';
import { cleanupVault } from '../test_utils.js';

describe('Mobile Triage Sticky Button (BUG-013)', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await emulateMobile();
    });

    after(async function () {
        await cleanupVault();
    });

    it('should clear button focus after click in Triage View', async () => {
        // 1. Create two tasks so triage doesn't immediately close
        await browser.execute(async () => {
            const tasks = [
                { name: 'Task1.md', content: '---\ntask: Task 1\nflow_state: dump\n---\n# Task 1' },
                { name: 'Task2.md', content: '---\ntask: Task 2\nflow_state: dump\n---\n# Task 2' }
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

        // 3. Find the shortlist button
        const shortlistBtn = await $('.shortlist');
        await expect(shortlistBtn).toBeDisplayed();

        // 4. Click the button using native script to avoid WDIO focus side effects
        await browser.execute((el) => (el as HTMLElement).click(), shortlistBtn);
        await browser.pause(1000); // Wait longer for transition/action

        // 5. Verify focus is NOT on the button anymore
        const focusState = await browser.execute((btn) => {
            return {
                isBtnFocused: document.activeElement === btn,
                activeTagName: document.activeElement?.tagName,
                activeId: document.activeElement?.id,
                activeClass: document.activeElement?.className
            };
        }, shortlistBtn);

        expect(focusState).toEqual(expect.objectContaining({
            isBtnFocused: false
        }));

        // 6. Optionally check for a specific "active" class if we use one, 
        // but since we don't, focus is the most likely culprit.
    });
});
