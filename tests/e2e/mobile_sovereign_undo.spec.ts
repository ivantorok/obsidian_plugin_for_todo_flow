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

            if (!(await adapter.exists('Task1.md'))) await app.vault.create('Task1.md', '# Task1');
            if (!(await adapter.exists('Task2.md'))) await app.vault.create('Task2.md', '# Task2');
        });

        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');
        await $('.focus-card.is-focused').waitForExist({ timeout: 5000 });
    });

    it('should undo a "Done" action and restore the previous task state', async () => {
        let title = await $('.todo-flow-task-card.is-focused .focus-title');
        expect(await title.getText()).toBe('Task1');

        // Click Done -> Moves to Task2
        await browser.keys(['x']);
        await browser.waitUntil(async () => {
            const focused = await $('.todo-flow-task-card.is-focused .focus-title');
            if (!(await focused.isExisting())) return false;
            return (await focused.getText()) === 'Task2';
        });

        // Click Undo
        await browser.keys(['u']);

        // Should be back on Task1
        await browser.waitUntil(async () => {
            const focused = await $('.todo-flow-task-card.is-focused .focus-title');
            if (!(await focused.isExisting())) return false;
            return (await focused.getText()) === 'Task1';
        });

        // Verify state is "Todo" in the vault
        const fileContent = await browser.execute(async () => {
            // @ts-ignore
            return await app.vault.adapter.read('todo-flow/CurrentStack.md');
        });
        expect(fileContent).toContain('- [ ] [[Task1]]');
    });

    it('should navigate down with Next (Skip) action', async () => {
        let title = await $('.todo-flow-task-card.is-focused .focus-title');
        expect(await title.getText()).toBe('Task1');

        // Press down -> Moves to Task2
        await browser.keys(['j']);
        await browser.waitUntil(async () => {
            const focused = await $('.todo-flow-task-card.is-focused .focus-title');
            if (!(await focused.isExisting())) return false;
            return (await focused.getText()) === 'Task2';
        });

        // Press up
        await browser.keys(['k']);

        // Should be back on Task1
        await browser.waitUntil(async () => {
            const focused = await $('.todo-flow-task-card.is-focused .focus-title');
            if (!(await focused.isExisting())) return false;
            return (await focused.getText()) === 'Task1';
        });
    });
});
