import { browser, expect, $, $$ } from '@wdio/globals';

describe('Phase 4: Skeptical Specs - Rapid QuickAdd Action Queue', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    it('should queue and replay actions taken on a temporary ID during task creation', async () => {
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');

        // 1. Trigger QuickAdd
        await browser.keys(['c']);
        const input = await $('input[type="text"]');
        await input.waitForExist();
        await input.setValue('RapidTask');

        // 2. Submit AND IMMEDIATELY PERFORM ACTION (Keyboard 'x' for Done)
        // We simulate a user with super-fast fingers
        await browser.keys(['Enter']);
        await browser.keys(['x']);

        // 3. Verification: The task should be marked as Done in the vault
        // even though 'x' was pressed while the ID was still 'temp-...'
        await browser.waitUntil(async () => {
            const content = await browser.execute(async () => {
                // @ts-ignore
                const tasks = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view.getTasks();
                const task = tasks.find(t => t.title === 'RapidTask');
                return task?.status;
            });
            return content === 'done';
        }, { timeout: 5000, timeoutMsg: 'Task status did not transition to done' });

        // SHOULD FAIL: Current implementation loses the 'x' if the ID changes between keydown and resolve.
    });
});
