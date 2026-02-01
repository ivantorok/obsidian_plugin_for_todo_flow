import { browser, expect, $ } from '@wdio/globals';

describe('Journey B: Stack Mechanics', () => {
    beforeEach(async function () {
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    // Helper function to create tasks via Dump → Triage → Stack flow
    async function setupStackWithTasks(taskNames: string[]) {
        // Open Dump
        await browser.execute('app.commands.executeCommandById("todo-flow:open-todo-dump")');
        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getLeavesOfType('todo-flow-dump-view').length > 0;
            });
        }, { timeout: 5000 });

        const dumpInput = await $('textarea.todo-flow-dump-input');

        // Create tasks
        for (const taskName of taskNames) {
            await dumpInput.setValue(taskName);
            await browser.keys(['Enter']);
            await browser.pause(300);
        }

        // Trigger Triage
        await dumpInput.setValue('done');
        await browser.keys(['Enter']);

        // Wait for Triage
        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getLeavesOfType('todo-flow-triage-view').length > 0;
            });
        }, { timeout: 5000 });

        // Keep all tasks (k for each)
        for (let i = 0; i < taskNames.length; i++) {
            await browser.keys(['k']);
            await browser.pause(500);
        }

        // Wait for Stack
        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getLeavesOfType('todo-flow-stack-view').length > 0;
            });
        }, { timeout: 5000 });

        await browser.pause(500); // Let Stack settle
    }

    it('should navigate with j/k keys', async () => {
        await setupStackWithTasks(['Task 1', 'Task 2', 'Task 3']);

        // Check initial focus (should be 0)
        let focusIndex = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.component.getFocusedIndex();
        });
        expect(focusIndex).toBe(0);

        // Navigate down with j
        await browser.keys(['j']);
        await browser.pause(200);

        focusIndex = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.component.getFocusedIndex();
        });
        expect(focusIndex).toBe(1);

        // Navigate down again
        await browser.keys(['j']);
        await browser.pause(200);

        focusIndex = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.component.getFocusedIndex();
        });
        expect(focusIndex).toBe(2);

        // Navigate up with k
        await browser.keys(['k']);
        await browser.pause(200);

        focusIndex = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.component.getFocusedIndex();
        });
        expect(focusIndex).toBe(1);

        console.log('[Test] ✅ Navigation with j/k works correctly');
    });

    it('should reorder tasks with Shift+K and Shift+J', async () => {
        await setupStackWithTasks(['Task A', 'Task B', 'Task C']);

        // Get initial order
        let titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks().map(t => t.title);
        });
        console.log('[Test] Initial order:', titles);
        expect(titles).toEqual(['Task A', 'Task B', 'Task C']);

        // Focus on Task B (index 1)
        await browser.keys(['j']);
        await browser.pause(200);

        // Move Task B up with Shift+K
        await browser.keys(['K']);
        await browser.pause(500);

        titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks().map(t => t.title);
        });
        console.log('[Test] After move up:', titles);
        expect(titles).toEqual(['Task B', 'Task A', 'Task C']);

        // Move Task B down with Shift+J
        await browser.keys(['J']);
        await browser.pause(500);

        titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks().map(t => t.title);
        });
        console.log('[Test] After move down:', titles);
        expect(titles).toEqual(['Task A', 'Task B', 'Task C']);

        console.log('[Test] ✅ Reordering with Shift+K/J works correctly');
    });

    it('should adjust duration with d/f keys', async () => {
        await setupStackWithTasks(['Duration Test']);

        // Get initial duration (default 30)
        let duration = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].duration;
        });
        console.log('[Test] Initial duration:', duration);
        expect(duration).toBe(30);

        // Increase with f
        await browser.keys(['f']);
        await browser.pause(300);

        duration = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].duration;
        });
        console.log('[Test] After f:', duration);
        expect(duration).toBe(45);

        // Decrease with d
        await browser.keys(['d']);
        await browser.pause(300);

        duration = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].duration;
        });
        console.log('[Test] After d:', duration);
        expect(duration).toBe(30);

        console.log('[Test] ✅ Duration adjustment works correctly');
    });

    it('should toggle anchor with Shift+F', async () => {
        await setupStackWithTasks(['Anchor Test']);

        // Check initial state
        let isAnchored = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].isAnchored;
        });
        expect(isAnchored).toBe(false);

        // Toggle anchor with Shift+F
        await browser.keys(['F']);
        await browser.pause(500);

        isAnchored = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].isAnchored;
        });
        expect(isAnchored).toBe(true);

        // Toggle off
        await browser.keys(['F']);
        await browser.pause(500);

        isAnchored = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].isAnchored;
        });
        expect(isAnchored).toBe(false);

        console.log('[Test] ✅ Anchor toggle works correctly');
    });

    it('should toggle task completion with x key', async () => {
        await setupStackWithTasks(['Toggle Test']);

        // COMPLETE: Mark done with x
        await browser.keys(['x']);
        await browser.pause(500);

        let status = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].status;
        });
        expect(status).toBe('done');
        console.log('[Test] ✅ Mark as done works');

        // UNCOMPLETE: Toggle back to todo with x
        await browser.keys(['x']);
        await browser.pause(500);

        status = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].status;
        });
        expect(status).toBe('todo');
        console.log('[Test] ✅ Toggle back to todo works');

        console.log('[Test] ✅ Task completion toggle works correctly');
    });
});
