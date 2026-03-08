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
        const shortlistBtn = await $('button=Shortlist →');
        await expect(shortlistBtn).toBeDisplayed();

        // 4. Click the button using native script to avoid WDIO focus side effects
        await browser.execute((el) => (el as HTMLElement).click(), shortlistBtn);

        // 5. Use waitUntil to deterministically verify focus is cleared
        // This avoids flaky fixed-pause timing issues
        await browser.waitUntil(async () => {
            const state = await browser.execute((btn) => {
                return document.activeElement !== btn;
            }, shortlistBtn);
            return state;
        }, {
            timeout: 5000,
            interval: 200,
            timeoutMsg: 'Button still focused after click — focus sovereignty violated'
        });

        // 6. Final verification of focus state
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
    });
});
