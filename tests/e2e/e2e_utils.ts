import { browser, $ } from '@wdio/globals';

// Helper to ensure Stack View is focused
export async function focusStack() {
    // @ts-ignore
    await browser.execute(() => {
        // @ts-ignore
        const leaf = app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
        if (leaf) {
            // @ts-ignore
            app.workspace.setActiveLeaf(leaf, { focus: true });
            const container = document.querySelector('.todo-flow-stack-container') as HTMLElement;
            if (container) container.focus();
        }
    });
    // @ts-ignore
    await browser.pause(300);
}

// Helper function to create tasks via Dump → Triage → Stack flow
export async function setupStackWithTasks(taskNames: string[]) {
    // Open Dump
    // @ts-ignore
    await browser.execute('app.commands.executeCommandById("todo-flow:open-todo-dump")');
    // @ts-ignore
    await browser.waitUntil(async () => {
        // @ts-ignore
        return await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-dump-view').length > 0;
        });
    }, { timeout: 5000 });

    const dumpInput = await $('textarea.todo-flow-dump-input');

    // Create tasks
    for (const taskName of taskNames) {
        await dumpInput.setValue(taskName);
        // @ts-ignore
        await browser.keys(['Enter']);
        // @ts-ignore
        await browser.pause(300);
    }

    // Trigger Triage
    await dumpInput.setValue('done');
    // @ts-ignore
    await browser.keys(['Enter']);

    // Wait for Triage
    // @ts-ignore
    await browser.waitUntil(async () => {
        // @ts-ignore
        return await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-triage-view').length > 0;
        });
    }, { timeout: 5000 });

    // Keep all tasks (k for each)
    for (let i = 0; i < taskNames.length; i++) {
        // @ts-ignore
        await browser.keys(['k']);
        // @ts-ignore
        await browser.pause(500);
    }

    // Wait for Stack
    // @ts-ignore
    await browser.waitUntil(async () => {
        // @ts-ignore
        return await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-stack-view').length > 0;
        });
    }, { timeout: 5000 });

    // @ts-ignore
    await browser.pause(500); // Let Stack settle
}
