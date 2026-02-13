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
            app.workspace.getLeavesOfType('todo-flow-lean-stack').forEach(leaf => leaf.detach());

            const persistencePath = 'todo-flow/CurrentStack.md';
            const adapter = app.vault.adapter;
            if (!(await adapter.exists('todo-flow'))) {
                await adapter.mkdir('todo-flow');
            }

            await adapter.write(persistencePath, '# Current Stack\n\n- [ ] [[Task1]]\n- [ ] [[Task2]]');

            if (!(await adapter.exists('Task1.md'))) await app.vault.create('Task1.md', '# Task 1');
            if (!(await adapter.exists('Task2.md'))) await app.vault.create('Task2.md', '# Task 2');
        });

        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');
        await $('[data-testid="lean-task-card"]').waitForExist({ timeout: 5000 });
    });

    it('should undo a "Done" action and restore the previous task state', async () => {
        const title = await $('[data-testid="lean-task-title"]');
        expect(await title.getText()).toBe('Task1');

        // Click Done -> Moves to Task2
        await $('[data-testid="lean-done-btn"]').click();
        await browser.waitUntil(async () => (await title.getText()) === 'Task2');

        // Click Undo
        const undoBtn = await $('[data-testid="lean-undo-btn"]');
        await undoBtn.click();

        // Should be back on Task1
        await browser.waitUntil(async () => (await title.getText()) === 'Task1');

        // Verify state is "Todo" in the vault
        const fileContent = await browser.execute(async () => {
            return await app.vault.adapter.read('todo-flow/CurrentStack.md');
        });
        expect(fileContent).toContain('- [ ] [[Task1]]');
    });

    it('should undo a "Next" (Skip) action', async () => {
        const title = await $('[data-testid="lean-task-title"]');
        expect(await title.getText()).toBe('Task1');

        // Click Next -> Moves to Task2
        await $('[data-testid="lean-next-btn"]').click();
        await browser.waitUntil(async () => (await title.getText()) === 'Task2');

        // Click Undo
        const undoBtn = await $('[data-testid="lean-undo-btn"]');
        await undoBtn.click();

        // Should be back on Task1
        await browser.waitUntil(async () => (await title.getText()) === 'Task1');
    });
});
