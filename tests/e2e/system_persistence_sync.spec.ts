import { browser, expect, $, $$ } from '@wdio/globals';

describe('System: Persistence and Syncing', () => {
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
        }, { timeout: 15000, timeoutMsg: 'Tasks did not appear in time (15s limit)' });

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

            if (view.component && view.component.update) {
                view.component.update();
            }
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

    it('should refresh the UI when CurrentStack.md is modified externally', async () => {
        // 1. Setup: Create stack with 2 tasks
        await browser.execute(async () => {
            const tasks = [
                { id: "Task A", title: "Task A", duration: 10 },
                { id: "Task B", title: "Task B", duration: 20 }
            ];
            // Use the plugin's internal method to ensure clean state
            const plugin = (window as any).app.plugins.plugins['todo-flow'];
            if (plugin && plugin.stackPersistenceService) {
                // Ensure settings are initialized for test environment
                if (!plugin.settings.targetFolder) {
                    plugin.settings.targetFolder = 'todo-flow';
                }

                // Explicitly create task files to ensure links resolve (with safety checks)
                try {
                    const vault = (window as any).app.vault;
                    if (!(await vault.adapter.exists('Task A.md'))) {
                        await vault.create('Task A.md', '- [ ] Task A');
                    }
                    if (!(await vault.adapter.exists('Task B.md'))) {
                        await vault.create('Task B.md', '- [ ] Task B');
                    }
                } catch (e: any) {
                    console.error('TEST SETUP ERROR: Failed to create task files', e);
                }

                console.log('TEST: File creation check complete.');

                const targetPath = `${plugin.settings.targetFolder}/CurrentStack.md`;
                (window as any)._testTargetPath = targetPath; // Store globally
                console.log('TEST: Saving stack via persistence service...');
                await plugin.stackPersistenceService.saveStack(tasks, targetPath);
                console.log('TEST: Stack saved.');

                // Allow time for file write and cache update
                await new Promise(r => setTimeout(r, 2000));

                // Verify file exists
                const exists = await (window as any).app.vault.adapter.exists(targetPath);
                if (!exists) throw new Error(`Failed to create ${targetPath}`);
                return targetPath;
            }
        });

        const targetPath = await browser.execute(() => (window as any)._testTargetPath);
        console.log('DEBUG: Target Path:', targetPath);

        // Verify file content confirms what we wrote
        const content = await browser.execute(async (path) => {
            return await (window as any).app.vault.adapter.read(path);
        }, targetPath);
        console.log('DEBUG: File Content:', content);

        console.log('TEST: Opening Stack View...');
        // 2. Open Stack View explicitly with correct state (StackView needs rootPath)
        await browser.execute(async (path) => {
            const app = (window as any).app;
            console.log('TEST: Calling setViewState...');
            await app.workspace.getLeaf(true).setViewState({
                type: 'todo-flow-stack-view',
                active: true,
                state: { rootPath: path }
            });
            console.log('TEST: setViewState returned.');
        }, targetPath);

        // Wait for view to mount
        console.log('TEST: Waiting for view mount...');
        await browser.pause(2000);
        console.log('TEST: Checking for task cards...');

        const taskA = await $('.todo-flow-task-card*=Task A');
        const exists = await taskA.isExisting();
        console.log(`TEST: Task A exists? ${exists}`);

        if (!exists) {
            const debugInfo = await browser.execute(async (path) => {
                const app = (window as any).app;
                const files = app.vault.getFiles().map((f: any) => f.path).join(', ');
                const content = await app.vault.adapter.read(path).catch((e: any) => `READ ERROR: ${e.message}`);
                const body = document.body.innerHTML.substring(0, 500); // truncated body
                const text = `Vault Files: [${files}]\nTarget Class Content: ${content}\nBody Start: ${body}`;

                // Write using vault adapter to avoid Node 'fs' permission prompts
                // Note: user prefers project root/local files over /tmp
                try {
                    await app.vault.adapter.write('debug_probe.txt', text);
                } catch (e: any) {
                    console.error('Failed to write debug probe using adapter:', e);
                }
                return text;
            }, targetPath);

            throw new Error(`DEBUG PROBE FAILURE (See debug_probe.txt in test vault root)`);
        }

        await expect(taskA).toExist();
        const taskB = await $('.todo-flow-task-card*=Task B');
        await expect(taskB).toExist();

        // 3. External Modification: Overwrite CurrentStack.md with only 1 task
        // Simulating Obsidian Sync pulling a new version
        await browser.execute(async () => {
            const newContent = `---
startTime: ${new Date().toISOString()}
---
- [ ] [[Task A.md|Task A]]`;

            await (window as any).app.vault.adapter.write('todo-flow/CurrentStack.md', newContent);
        });

        // 4. Wait for Watcher to trigger reload
        // This is the race condition area: Does the plugin see the change?
        await browser.pause(2000);

        // 5. Verify UI reflects the change (Task B should be gone)
        // BUG-009 Assertion: This is expected to FAIL if the bug exists
        const tasks = await $$('.todo-flow-task-card');
        await expect(tasks.length).toBe(1);
        await expect(taskB).not.toExist();

        // 6. Persistence Check: Perform an action (toggle done) and verify file
        // If stale state persisted, Task B will reappear in the file.
        const checkbox = await taskA.$('.todo-flow-checkbox, .focus-action-btn.complete, button.title');
        // Note: Using title click or strict selector depending on view mode. 
        // For standard view, let's just use the title to toggle or open.
        // Actually, let's just wait. If we edit, we might trigger the overwrite.

        // Let's force a save via internal method to mimic "auto-save on change"
        // Or better, interact with the UI.
        await taskA.click(); // Focus it
        await browser.keys(['Enter']); // Toggle complete (if focused) or just change focus.

        await browser.pause(1000);

        // Read file content
        const fileContent = await browser.execute(async () => {
            return await (window as any).app.vault.adapter.read('todo-flow/CurrentStack.md');
        });

        // If bug exists, Task B might be back in the file content
        expect(fileContent).not.toContain('Task B');
    });

});
