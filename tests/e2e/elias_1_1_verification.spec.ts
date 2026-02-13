import { browser, expect, $, $$ } from '@wdio/globals';
import { emulateMobile } from './mobile_utils.js';

describe('Elias 1.1 (Focus & Momentum) Verification - FEAT-004: Perpetual Loop', () => {

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
            // Create a stack with two tasks
            await adapter.write(persistencePath, '# Current Stack\n\n- [ ] [[Task1]]\n- [ ] [[Task2]]');

            if (!(await adapter.exists('Task1.md'))) await app.vault.create('Task1.md', '# Task 1');
            if (!(await adapter.exists('Task2.md'))) await app.vault.create('Task2.md', '# Task 2');
        });

        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');
        await $('[data-testid="lean-task-card"]').waitForExist({ timeout: 5000 });
    });

    it('should show Victory Lap card after clicking NEXT on the final task', async () => {
        const title = await $('[data-testid="lean-task-title"]');
        expect(await title.getText()).toBe('Task1');

        const nextBtn = await $('[data-testid="lean-next-btn"]');
        await nextBtn.click(); // Task 1 -> Task 2

        await browser.waitUntil(async () => (await title.getText()) === 'Task2', {
            timeout: 5000,
            timeoutMsg: 'Expected Task2'
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

        await nextBtn.click(); // Task1 -> Task2
        await browser.waitUntil(async () => (await title.getText()) === 'Task2', {
            timeout: 5000,
            timeoutMsg: 'Expected Task2 before going to Victory Lap'
        });

        await nextBtn.click(); // Task 2 -> Victory Lap

        const restartBtn = await $('[data-testid="victory-restart-btn"]');
        await restartBtn.waitForExist();
        await restartBtn.click();

        await browser.waitUntil(async () => (await title.getText()) === 'Task1', {
            timeout: 5000,
            timeoutMsg: 'Expected wrap around to Task1'
        });
    });

    it('should capture a new task via Immersion Overlay and see it in the stack', async () => {
        const fab = await $('[data-testid="lean-capture-fab"]');
        await fab.click();

        const overlay = await $('[data-testid="immersion-overlay"]');
        await overlay.waitForExist({
            timeout: 2000,
            timeoutMsg: 'Immersion Overlay should appear'
        });

        const input = await $('[data-testid="immersion-input"]');
        await input.setValue('Captured Task');
        const submitBtn = await $('[data-testid="immersion-submit-btn"]');
        await submitBtn.click();

        await overlay.waitForExist({ reverse: true, timeout: 5000 });
        await browser.pause(500);

        // Navigate to Victory Lap to see if it was added
        const nextBtn = await $('[data-testid="lean-next-btn"]');
        await nextBtn.click(); // Task1 -> Task2

        await browser.waitUntil(async () => {
            const currentTitle = await $('[data-testid="lean-task-title"]');
            return (await currentTitle.getText()) === 'Task2';
        }, { timeout: 5000, timeoutMsg: 'Expected Task2 after navigation' });

        const nextBtn2 = await $('[data-testid="lean-next-btn"]');
        await nextBtn2.click(); // Task 2 -> Captured Task

        await browser.waitUntil(async () => {
            const currentTitle = await $('[data-testid="lean-task-title"]');
            return (await currentTitle.getText()) === 'Captured Task';
        }, { timeout: 5000, timeoutMsg: 'Expected Captured Task after navigation' });

        const nextBtn3 = await $('[data-testid="lean-next-btn"]');
        await nextBtn3.click(); // Captured Task -> Victory Lap

        const summaryTasks = await $$('[data-testid="victory-summary-item"]');
        expect(summaryTasks.length).toBe(3);
        expect(await summaryTasks[2].getText()).toContain('Captured Task');
    });
});
