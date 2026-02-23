import { browser, expect, $, $$ } from '@wdio/globals';

describe('Phase 4: Skeptical Specs - Rapid QuickAdd Action Queue', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    it('should queue and replay actions taken on a temporary ID during task creation', async () => {
        // 0. Open Stack and Wait for UI
        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');

        const mainView = await $('[data-ui-ready="true"]');
        await mainView.waitForExist();
        await mainView.click();

        // 1. Trigger QuickAdd
        // @ts-ignore
        await browser.keys(['c']);
        const input = await $('.prompt-input');
        await input.waitForExist();
        await input.setValue('RapidTask');

        // 2. Submit AND IMMEDIATELY PERFORM ACTION (Keyboard 'x' for Done)
        // We simulate a user with super-fast fingers
        // @ts-ignore
        await browser.keys(['Enter']);

        // Small pause to allow the Submit to trigger the UI update but BEFORE it resolves
        await browser.pause(500);

        // Mark as done immediately
        // @ts-ignore
        await browser.keys(['x']);

        // 4. Verification: The task should be marked as Done in the vault
        // even though 'x' was pressed while the ID was still 'temp-...'
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            const status = await browser.execute(async () => {
                try {
                    // @ts-ignore
                    const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
                    if (!view) return null;
                    const tasks = view.getTasks();
                    const task = tasks.find(t => t.title === 'RapidTask');
                    return task?.status;
                } catch (e) {
                    return null;
                }
            });
            return status === 'done';
        }, { timeout: 15000, timeoutMsg: 'Task status did not transition to done' });
    });
});
