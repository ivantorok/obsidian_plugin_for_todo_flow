import { browser, expect, $, $$ } from '@wdio/globals';

describe('Persistence Verification', () => {
    beforeEach(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    async function focusStack() {
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

    async function setupStackWithTasks(taskNames: string[]) {
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

    it('should preserve stack state (durations, anchors, status) across reloads', async () => {
        // Clear the vault at the start of the test
        // @ts-ignore
        await browser.executeAsync(async (done: any) => {
            // @ts-ignore
            const files = app.vault.getFiles();
            for (const file of files) {
                try {
                    // @ts-ignore
                    await app.vault.delete(file);
                } catch (e) { }
            }
            done();
        });

        // 1. Setup: Clear stack and add tasks
        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => app.workspace.getLeavesOfType('todo-flow-stack-view').length > 0);
        });

        await focusStack();

        // 2. Prep: Add 3 tasks
        await setupStackWithTasks(['Task 1', 'Task 2', 'Task 3']);
        await focusStack();

        // Wait for tasks to be present in view
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            const count = await browser.execute(() => {
                // @ts-ignore
                const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
                return view ? view.getTasks().length : 0;
            });
            return count === 3;
        }, { timeout: 5000, timeoutMsg: 'Tasks did not appear in time' });

        // 3. Modify Tasks
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            const tasks = view.getTasks();
            const controller = view.getController();

            if (!tasks[0] || !tasks[1] || !tasks[2]) {
                throw new Error(`Tasks not found! Found ${tasks.length} tasks.`);
            }

            // Task 1: Set duration to 45m (index 0)
            controller.updateTaskById(tasks[0].id, { duration: 45 });

            // Task 2: Anchor (index 1)
            controller.toggleAnchor(1);

            // Task 3: Complete (index 2)
            controller.toggleStatus(2);

            view.update();
        });

        // Verify state before reload
        // @ts-ignore
        let preTasks = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks().map((t: any) => ({
                id: t.id,
                title: t.title,
                duration: t.duration,
                isAnchored: t.isAnchored,
                status: t.status
            }));
        });
        console.log(`[Test] Pre-reload tasks: ${JSON.stringify(preTasks, null, 2)}`);

        expect(preTasks[0].duration).toBe(45);
        expect(preTasks[1].isAnchored).toBe(true);
        expect(preTasks[2].status).toBe('done');

        // IMPORTANT: Wait for the 500ms debounced persistence save in StackView.ts to fire
        // @ts-ignore
        await browser.pause(2000);

        // 3. Verify it was saved to the file system (Pre-reload)
        // @ts-ignore
        const stackFileContent = await browser.executeAsync(async (done: any) => {
            try {
                // @ts-ignore
                const exists = await app.vault.adapter.exists('todo-flow/CurrentStack.md');
                if (!exists) {
                    // @ts-ignore
                    const rootExist = await app.vault.adapter.exists('CurrentStack.md');
                    if (rootExist) {
                        // @ts-ignore
                        done(await app.vault.adapter.read('CurrentStack.md'));
                    } else {
                        done("FILE_NOT_FOUND");
                    }
                } else {
                    // @ts-ignore
                    done(await app.vault.adapter.read('todo-flow/CurrentStack.md'));
                }
            } catch (e: any) {
                done("ERROR: " + e.message);
            }
        });
        console.log(`[Test] Persistence content before reload:\n${stackFileContent}`);

        // 4. Action: Reload Obsidian UI (simulating a plugin reload/restart)
        // @ts-ignore
        await browser.execute('location.reload()');
        // Wait for Obsidian to load back
        await browser.pause(5000);

        // 5. Verification
        // Wait for Obsidian vault to index todo-flow/CurrentStack.md (can be slow in fresh reload)
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(async () => {
                // @ts-ignore
                return await app.vault.adapter.exists('todo-flow/CurrentStack.md');
            });
        }, { timeout: 20000, timeoutMsg: 'todo-flow/CurrentStack.md NOT found on disk' });

        // Trigger restoration
        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');

        // Wait for tasks to appear in DOM
        // @ts-ignore
        await browser.waitUntil(async () => {
            const cards = await $$('.todo-flow-task-card');
            return cards.length === 3;
        }, { timeout: 30000, timeoutMsg: 'Tasks did not appear in DOM in 30s' });

        // @ts-ignore
        let postTasks = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks().map((t: any) => ({
                title: t.title,
                duration: t.duration,
                isAnchored: t.isAnchored,
                status: t.status
            }));
        });

        expect(postTasks.length).toBe(3);
        // Note: Task 2 is anchored, so it should be at index 0
        expect(postTasks[0].title).toBe('Task 2');
        expect(postTasks[0].isAnchored).toBe(true);

        expect(postTasks[1].title).toBe('Task 1');
        expect(postTasks[1].duration).toBe(45);

        expect(postTasks[2].title).toBe('Task 3');
        expect(postTasks[2].status).toBe('done');
    });
});
