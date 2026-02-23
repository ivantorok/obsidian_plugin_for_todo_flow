import { browser, expect, $, $$ } from '@wdio/globals';
import { emulateMobile } from './mobile_utils.js';

describe('Elias 1.1 Momentum - FEAT-007: Sovereign Undo', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await emulateMobile();
    });

    beforeEach(async () => {
        await browser.execute(async () => {
            // @ts-ignore
            app.workspace.getLeavesOfType('todo-flow-stack-view').forEach(leaf => leaf.detach());

            const persistencePath = 'todo-flow/CurrentStack.md';
            // @ts-ignore
            const adapter = app.vault.adapter;
            if (!(await adapter.exists('todo-flow'))) {
                await adapter.mkdir('todo-flow');
            }

            await adapter.write(persistencePath, '# Current Stack\n\n- [ ] [[Task1]]\n- [ ] [[Task2]]');

            // @ts-ignore
            if (!(await adapter.exists('Task1.md'))) await app.vault.create('Task1.md', '# Task1');
            // @ts-ignore
            if (!(await adapter.exists('Task2.md'))) await app.vault.create('Task2.md', '# Task2');
        });

        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');
        await $('.focus-card.is-focused').waitForExist({ timeout: 5000 });
    });

    it('should undo a "Done" action and restore the previous task state', async () => {
        let title = await $('.todo-flow-task-card.is-focused .focus-title');
        expect(await title.getText()).toBe('Task1');

        // Click Complete -> Moves to Task2
        const completeBtn = await $('[data-testid="focus-complete-btn"]');
        await completeBtn.click();

        await browser.waitUntil(async () => {
            const focused = await $('.todo-flow-task-card.is-focused .focus-title');
            if (!(await focused.isExisting())) return false;
            return (await focused.getText()) === 'Task2';
        });

        // Test the "Undo" concept (on mobile, we use previous + complete to undo)
        // BUT wait, in Sovereign Undo (FEAT-007), marking done automatically reveals
        // a toast or we can navigate back and click undo!
        // The mobile implementation for undo is: go back to Task1, click Undo.
        const prevBtn = await $$('.focus-nav-btn')[0];
        await prevBtn.click();

        await browser.waitUntil(async () => {
            const focused = await $('.todo-flow-task-card.is-focused .focus-title');
            if (!(await focused.isExisting())) return false;
            return (await focused.getText()) === 'Task1';
        });

        const undoBtn = await $('[data-testid="focus-complete-btn"]');
        expect(await undoBtn.getText()).toBe('Undo');
        await undoBtn.click();

        // Wait for persistence to flush (it has a 500ms debounce)
        await browser.waitUntil(async () => {
            const fileContent = await browser.execute(async () => {
                // @ts-ignore
                return await app.vault.adapter.read('todo-flow/CurrentStack.md');
            });
            return fileContent.includes('- [ ] [[Task1');
        }, { timeout: 5000, timeoutMsg: 'Expected CurrentStack.md to be updated with [ ] for Task1' });
    });

    it('should navigate down with Next (Skip) action', async () => {
        let title = await $('.todo-flow-task-card.is-focused .focus-title');
        expect(await title.getText()).toBe('Task1');

        // Press down -> Moves to Task2
        const nextBtn = await $$('.focus-nav-btn')[1];
        await nextBtn.click();

        await browser.waitUntil(async () => {
            const focused = await $('.todo-flow-task-card.is-focused .focus-title');
            if (!(await focused.isExisting())) return false;
            return (await focused.getText()) === 'Task2';
        });

        // Press up
        const prevBtn = await $$('.focus-nav-btn')[0];
        await prevBtn.click();

        // Should be back on Task1
        await browser.waitUntil(async () => {
            const focused = await $('.todo-flow-task-card.is-focused .focus-title');
            if (!(await focused.isExisting())) return false;
            return (await focused.getText()) === 'Task1';
        });
    });
});
