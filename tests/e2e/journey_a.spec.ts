import { browser, expect, $ } from '@wdio/globals';

describe('Journey A: Dump & Triage', () => {
    beforeEach(async function () {
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    it('should complete the full Dump -> Triage -> Stack flow', async () => {
        // 1. Open Dump View
        await browser.execute('app.commands.executeCommandById("todo-flow:open-todo-dump")');

        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getLeavesOfType('todo-flow-dump-view').length > 0;
            });
        }, { timeout: 5000, timeoutMsg: 'Dump View did not open' });

        const dumpInput = await $('textarea.todo-flow-dump-input');
        await expect(dumpInput).toExist();

        // 2. Input Tasks
        await dumpInput.click();
        await dumpInput.setValue('Task 1');
        await browser.keys(['Enter']);
        await browser.pause(500);

        await dumpInput.setValue('Task 2');
        await browser.keys(['Enter']);
        await browser.pause(500);

        await dumpInput.setValue('Task 3');
        await browser.keys(['Enter']);
        await browser.pause(500);

        // 3. Finish Dump - triggers Triage
        await dumpInput.setValue('done');
        await browser.keys(['Enter']);

        // 4. Verify Triage View Opens
        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getLeavesOfType('todo-flow-triage-view').length > 0;
            });
        }, { timeout: 5000, timeoutMsg: 'Triage View did not open after typing "done"' });

        const triageCard = await $('.triage-card-wrapper');
        await expect(triageCard).toExist();

        // 5. Perform Triage Actions
        // Correct keybindings: k/ArrowRight = Keep, j/ArrowLeft = Archive

        // Task 1: Keep (k or ArrowRight)
        await browser.keys(['k']);
        await browser.pause(500);

        // Task 2: Archive (j or ArrowLeft)
        await browser.keys(['j']);
        await browser.pause(500);

        // Task 3: Keep (k)
        // This is the LAST task - after swiping, triage should complete
        await browser.keys(['k']);
        await browser.pause(1000); // Extra time for completion callback

        // 6. Verify Stack View Opens
        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getLeavesOfType('todo-flow-stack-view').length > 0;
            });
        }, { timeout: 10000, timeoutMsg: 'Stack View did not open after completing triage' });

        const stackView = await $('.todo-flow-stack-container');
        await expect(stackView).toExist();

        // 7. Verify Task Content
        const titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            // @ts-ignore
            return view.getTasks().map(t => t.title);
        });

        console.log('[Test] Final Stack Titles:', titles);

        expect(titles).toContain('Task 1');
        expect(titles).toContain('Task 3');
        expect(titles).not.toContain('Task 2');

        console.log('[Test] ✅ Journey A completed successfully.');
    });
});
