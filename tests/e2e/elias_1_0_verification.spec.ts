import { browser, expect, $ } from '@wdio/globals';
import { emulateMobile } from './mobile_utils.js';

describe('Elias 1.0 (Lean Mobile) Verification', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await emulateMobile();
    });

    beforeEach(async () => {
        await browser.execute(async () => {
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

    it('should mark task as DONE and move to next', async () => {
        const title = await $('[data-testid="lean-task-title"]');
        expect(await title.getText()).toBe('Task 1');

        const doneBtn = await $('[data-testid="lean-done-btn"]');
        await doneBtn.click();

        // Should now show Task 2
        await browser.waitUntil(async () => (await title.getText()) === 'Task 2', {
            timeout: 5000,
            timeoutMsg: 'Expected Task 2 to be shown after Task 1 marked DONE'
        });

        // Verify Task 1 is marked done in vault
        const task1Content = await browser.execute(async () => {
            const file = app.vault.getAbstractFileByPath('Task1.md');
            // @ts-ignore
            return file ? await app.vault.read(file) : '';
        });
        expect(task1Content).toContain('status: done');
    });

    it('should mark task as PARKED and move to next', async () => {
        const title = await $('[data-testid="lean-task-title"]');
        expect(await title.getText()).toBe('Task 1');

        const parkBtn = await $('[data-testid="lean-park-btn"]');
        await parkBtn.click();

        await browser.waitUntil(async () => (await title.getText()) === 'Task 2', {
            timeout: 5000
        });

        // Verify Task 1 is parked in vault
        const task1Content = await browser.execute(async () => {
            const file = app.vault.getAbstractFileByPath('Task1.md');
            // @ts-ignore
            return file ? await app.vault.read(file) : '';
        });
        expect(task1Content).toContain('flow_state: parked');
    });

    it('should capture new ideas via the FAB', async () => {
        const fab = await $('[data-testid="lean-capture-fab"]');
        await fab.click();

        const input = await $('[data-testid="lean-capture-input"]');
        await input.waitForExist();
        await input.setValue('An amazing new thought');

        const submit = await $('[data-testid="lean-submit-capture"]');
        await submit.click();

        // Verify it was appended to Mobile_Inbox.md
        const inboxContent = await browser.execute(async () => {
            const file = app.vault.getAbstractFileByPath('Mobile_Inbox.md');
            // @ts-ignore
            return file ? await app.vault.read(file) : '';
        });
        expect(inboxContent).toContain('An amazing new thought');
    });
});
