import { browser, expect, $, $$ } from '@wdio/globals';
import { emulateMobile } from './mobile_utils.js';

describe('Elias 1.1 Momentum - FEAT-006: Horizon Guardian', () => {

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

            // Task 1: Active
            // Task 2: No anchor
            // Task 3: Anchored in the future (we'll set a time 1 hour from now)
            const now = new Date();
            const future = new Date(now.getTime() + 60 * 60 * 1000);
            const timeStr = future.getHours().toString().padStart(2, '0') + ':' + future.getMinutes().toString().padStart(2, '0');

            await adapter.write(persistencePath,
                `# Current Stack\n\n- [ ] [[Task1]]\n- [ ] [[Task2]]\n- [ ] [[Task3]] {${timeStr}}`);

            if (!(await adapter.exists('Task1.md'))) await app.vault.create('Task1.md', '# Task 1');
            if (!(await adapter.exists('Task2.md'))) await app.vault.create('Task2.md', '# Task 2');
            if (!(await adapter.exists('Task3.md'))) await app.vault.create('Task3.md', '# Task 3');
        });

        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');
        await $('[data-testid="lean-task-card"]').waitForExist({ timeout: 5000 });
    });

    it('should display the Horizon Guardian when a future anchored task exists', async () => {
        const guardian = await $('[data-testid="horizon-guardian"]');
        await guardian.waitForExist({ timeout: 5000 });

        const guardianTitle = await $('[data-testid="guardian-task-title"]');
        expect(await guardianTitle.getText()).toBe('Task3');

        const countdown = await $('[data-testid="guardian-countdown"]');
        expect(await countdown.getText()).toMatch(/\d+m/); // e.g., "60m" or "59m"
    });

    it('should shift the horizon when the upcoming anchored task is completed', async () => {
        // First, verify Task 3 is the guardian
        expect(await $('[data-testid="guardian-task-title"]').getText()).toBe('Task3');

        // Navigate to Task 2
        await $('[data-testid="lean-next-btn"]').click();
        await browser.waitUntil(async () => (await $('[data-testid="lean-task-title"]').getText()) === 'Task2');

        // Navigate to Task 3
        await $('[data-testid="lean-next-btn"]').click();
        await browser.waitUntil(async () => (await $('[data-testid="lean-task-title"]').getText()) === 'Task3');

        // Mark Task 3 as Done
        await $('[data-testid="lean-done-btn"]').click();

        // Guardian should now be empty or hidden if no more anchored tasks exist
        const guardian = await $('[data-testid="horizon-guardian"]');
        await guardian.waitForExist({ reverse: true, timeout: 5000 });
    });
});
