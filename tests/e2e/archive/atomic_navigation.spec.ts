
import { browser, expect, $, $$ } from '@wdio/globals';

describe('Atomic File Mode Navigation', () => {
    beforeEach(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    it('should drill down into a leaf node when pressing Enter (Atomic Mode)', async () => {
        // 1. Open Daily Stack
        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => app.workspace.getLeavesOfType('todo-flow-stack-view').length > 0);
        });

        const container = await $('.todo-flow-stack-container');
        await container.click();

        // 2. Add a leaf task
        const input = await $('input.todo-flow-time-input'); // Wait for inputs to be present or just use quick add key
        // @ts-ignore
        await browser.keys(['c']);
        // @ts-ignore
        await browser.pause(200);
        // @ts-ignore
        await browser.keys(['Leaf Task', 'Enter']);
        // @ts-ignore
        await browser.pause(500);

        // 3. Focus the new task (it should be at index 0 or we find it)
        // Actually 'c' adds to top usually, checking... StackView.svelte unshifts.

        // Ensure "Leaf Task" is focused
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            const tasks = view.getTasks();
            const index = tasks.findIndex(t => t.title === 'Leaf Task');
            if (index !== -1) view.component.setFocus(index);
        });
        // @ts-ignore
        await browser.pause(200);

        // 4. Press Enter to Drill Down
        // @ts-ignore
        await browser.keys(['Enter']);
        // @ts-ignore
        await browser.pause(500);

        // 5. Verify we have drilled down (Stack should be empty or contain children if any, here empty)
        // The view tasks length should be 0.
        // @ts-ignore
        const currentTasksCount = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks().length;
        });

        // CURRENT BEHAVIOR (Failure Expectation): It remains on the parent stack (count >= 1)
        console.log(`[Test] Tasks count after Enter: ${currentTasksCount}`);

        // EXPECTED BEHAVIOR (After Fix): It should be 0 (empty stack of the new file)
        expect(currentTasksCount).toBe(0);

        // 6. Verify Back Navigation works
        // @ts-ignore
        await browser.keys(['h']);
        // @ts-ignore
        await browser.pause(500);

        // @ts-ignore
        const tasksAfterBack = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks().length;
        });
        expect(tasksAfterBack).toBeGreaterThan(0);
    });
});
