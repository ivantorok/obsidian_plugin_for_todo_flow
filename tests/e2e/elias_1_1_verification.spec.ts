import { browser, expect, $ } from '@wdio/globals';
import { emulateMobile } from './mobile_utils.js';

describe('Elias 1.1 (Focus & Momentum) Verification - FEAT-004: Perpetual Loop', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await emulateMobile();
    });

    beforeEach(async () => {
        await browser.execute(async () => {
            app.workspace.getLeavesOfType('todo-flow-stack-view').forEach(leaf => leaf.detach());

            const persistencePath = 'todo-flow/CurrentStack.md';
            const adapter = app.vault.adapter;
            if (!(await adapter.exists('todo-flow'))) {
                await adapter.mkdir('todo-flow');
            }
            // Create a stack with two tasks
            await adapter.write(persistencePath, '# Current Stack\n\n- [ ] [[Task 1]]\n- [ ] [[Task 2]]');

            if (!(await adapter.exists('Task 1.md'))) await app.vault.create('Task 1.md', '# Task 1');
            if (!(await adapter.exists('Task 2.md'))) await app.vault.create('Task 2.md', '# Task 2');
        });

        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');
        await $('[data-testid="lean-task-card"]').waitForExist({ timeout: 5000 });
    });

    it('should show Victory Lap card after clicking NEXT on the final task', async () => {
        const title = await $('[data-testid="lean-task-title"]');
        expect(await title.getText()).toBe('Task 1');

        const nextBtn = await $('[data-testid="lean-next-btn"]');
        await nextBtn.click(); // Task 1 -> Task 2

        await browser.waitUntil(async () => (await title.getText()) === 'Task 2', {
            timeout: 5000,
            timeoutMsg: 'Expected Task 2'
        });

        await nextBtn.click(); // Task 2 -> Victory Lap

        const victoryCard = await $('[data-testid="victory-lap-card"]');
        await victoryCard.waitForExist({
            timeout: 5000,
            timeoutMsg: 'Victory Lap card should be visible after clicking NEXT on the last task'
        });

        // Verify Bird's Eye View (all tasks listed)
        const summaryTasks = await $$('[data-testid="victory-summary-item"]');
        expect(summaryTasks.length).toBe(2);
    });

    it('should wrap around to the first task when clicking "Restart Loop" on Victory Lap card', async () => {
        const title = await $('[data-testid="lean-task-title"]');
        const nextBtn = await $('[data-testid="lean-next-btn"]');

        await nextBtn.click(); // Task 1 -> Task 2
        await browser.waitUntil(async () => (await title.getText()) === 'Task 2', {
            timeout: 5000,
            timeoutMsg: 'Expected Task 2 before going to Victory Lap'
        });

        await nextBtn.click(); // Task 2 -> Victory Lap

        const restartBtn = await $('[data-testid="victory-restart-btn"]');
        await restartBtn.waitForExist();
        await restartBtn.click();

        await browser.waitUntil(async () => (await title.getText()) === 'Task 1', {
            timeout: 5000,
            timeoutMsg: 'Expected wrap around to Task 1'
        });
    });
});
