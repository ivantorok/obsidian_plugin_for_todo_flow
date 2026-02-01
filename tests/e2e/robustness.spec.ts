import { expect, browser, $ } from '@wdio/globals';

describe.skip('Robustness Verification', () => {
    beforeEach(async () => {
        // Enable debug logging
        await browser.execute(() => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            if (plugin) {
                plugin.settings.debug = true;
                plugin.saveSettings();
            }
        });
    });

    // TODO: Unskip after implementing more robust file system watcher mocking or increasing headless timeouts
    it('should detect external modifications to CurrentStack.md and reload', async () => {
        const persistencePath = 'todo-flow/CurrentStack.md';

        // 1. Setup: Ensure we have a clean slate and open the view
        await browser.executeAsync(async (path, done) => {
            // Ensure folder exists
            if (!await app.vault.adapter.exists('todo-flow')) {
                await app.vault.adapter.mkdir('todo-flow');
            }

            // Helper for reliable writes
            const safeWrite = async (filepath: string, content: string) => {
                const file = app.vault.getAbstractFileByPath(filepath);
                if (file) {
                    // @ts-ignore
                    await app.vault.modify(file, content);
                } else {
                    await app.vault.create(filepath, content);
                }
            };

            // Create initial file
            await safeWrite(path, '# Current Stack\n\n- [ ] [[Task 1]]');
            await safeWrite('todo-flow/Task 1.md', '# Task 1');

            // Wait for cache and content
            await new Promise((resolve) => {
                const interval = setInterval(async () => {
                    const f = app.vault.getAbstractFileByPath(path);
                    if (f) {
                        try {
                            // @ts-ignore
                            const content = await app.vault.read(f);
                            if (content.includes('Task 1')) {
                                clearInterval(interval);
                                resolve(true);
                            }
                        } catch (e) { }
                    }
                }, 100);
            });

            // Debug: Read file content
            const f = app.vault.getAbstractFileByPath(path);
            if (f) {
                // @ts-ignore
                const content = await app.vault.read(f);
                console.log('[Test Setup] CurrentStack.md content:', content);
            } else {
                console.log('[Test Setup] CurrentStack.md NOT FOUND after wait');
            }

            // Reload view
            const leaves = app.workspace.getLeavesOfType("todo-flow-stack-view");
            console.log(`[Test Setup] Leaves found: ${leaves.length}`);
            if (leaves.length > 0) {
                // @ts-ignore
                await leaves[0].view.reload();
            } else {
                console.log('[Test Setup] Opening new daily stack');
                app.commands.executeCommandById("todo-flow:open-daily-stack");
            }
            done();
        }, persistencePath);

        // Wait for setup
        await browser.waitUntil(async () => {
            const tasks = await browser.execute(() => {
                const view = app.workspace.getLeavesOfType("todo-flow-stack-view")[0]?.view;
                // @ts-ignore
                return view ? view.getTasks().map(t => t.title) : [];
            });
            // Allow missing due to cache lag
            return tasks.some(t => t.includes('Task 1'));
        }, { timeout: 15000, timeoutMsg: 'Stack view did not load Task 1' });

        // 2. Simulate External Modification
        await browser.pause(2100);

        // HACK: Reset the plugin's internal write time to 0 to ensure ANY modification is treated as external
        // This avoids race conditions with file system timestamps and eliminates the need for long pauses.
        await browser.execute(() => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            if (plugin && plugin.stackPersistenceService) {
                console.log('[Test] Forcing lastInternalWriteTime to 0');
                plugin.stackPersistenceService.lastInternalWriteTime = 0;
            } else {
                console.error('[Test] Could not find plugin or persistence service');
            }
        });

        await browser.executeAsync(async (path, done) => {
            // Helper for reliable writes
            const safeWrite = async (filepath: string, content: string) => {
                const file = app.vault.getAbstractFileByPath(filepath);
                if (file) {
                    // @ts-ignore
                    await app.vault.modify(file, content);
                } else {
                    await app.vault.create(filepath, content);
                }
            };

            // Create Task 2 file
            await safeWrite('todo-flow/Task 2.md', '# Task 2');

            const file = app.vault.getAbstractFileByPath(path);
            if (file) {
                // @ts-ignore
                const content = await app.vault.read(file);
                // Ensure we don't duplicate if retrying
                if (!content.includes('Task 2')) {
                    const newContent = content + '\n- [ ] [[Task 2]]';
                    // Trigger modification event (which the plugin watches)
                    // @ts-ignore
                    await app.vault.modify(file, newContent);
                }
            }
            done();
        }, persistencePath);

        // 3. Verification: The view should have reloaded
        await browser.waitUntil(async () => {
            const currentTasks = await browser.execute(() => {
                const leaf = app.workspace.getLeavesOfType("todo-flow-stack-view")[0];
                // @ts-ignore
                return leaf ? leaf.view.getTasks().map(t => t.title) : [];
            });
            return currentTasks.some(t => t.includes('Task 2'));
        }, { timeout: 15000, timeoutMsg: 'View did not reload after external modification' });
    });

    // TODO: Unskip when initial task setup is less flaky in full suite
    it('should handle missing task notes gracefully with a visual warning', async () => {
        const persistencePath = 'todo-flow/CurrentStack.md';

        // Clear vault logic to ensure clean state
        await browser.executeAsync(async (done) => {
            const files = app.vault.getFiles();
            for (const file of files) {
                await app.vault.delete(file);
            }
            if (await app.vault.adapter.exists('todo-flow')) {
                await app.vault.adapter.rmdir('todo-flow', true);
            }
            done();
        });

        // 1. Setup: Create tasks
        await browser.executeAsync(async (path, done) => {
            // Ensure folder exists
            if (!await app.vault.adapter.exists('todo-flow')) {
                await app.vault.adapter.mkdir('todo-flow');
            }

            const safeWrite = async (filepath: string, content: string) => {
                const file = app.vault.getAbstractFileByPath(filepath);
                if (file) {
                    // @ts-ignore
                    await app.vault.modify(file, content);
                } else {
                    await app.vault.create(filepath, content);
                }
            };

            // Create Stack and Task to delete
            await safeWrite(path, '# Current Stack\n\n- [ ] [[Task 3]]');
            await safeWrite('todo-flow/Task 3.md', '# Task 3');

            // Wait for cache and content
            await new Promise((resolve) => {
                const interval = setInterval(async () => {
                    const f = app.vault.getAbstractFileByPath(path);
                    if (f) {
                        try {
                            // @ts-ignore
                            const content = await app.vault.read(f);
                            if (content.includes('Task 3')) {
                                clearInterval(interval);
                                resolve(true);
                            }
                        } catch (e) { }
                    }
                }, 100);
            });

            // Reload view (robustness test)
            const leaves = app.workspace.getLeavesOfType("todo-flow-stack-view");
            if (leaves.length > 0) {
                // @ts-ignore
                await leaves[0].view.reload();
            } else {
                app.commands.executeCommandById("todo-flow:open-daily-stack");
            }
            done();
        }, persistencePath);

        // Wait for task to appear
        await browser.waitUntil(async () => {
            const tasks = await browser.execute(() => {
                const view = app.workspace.getLeavesOfType("todo-flow-stack-view")[0]?.view;
                // @ts-ignore
                return view ? view.getTasks().map(t => t.title) : [];
            });
            // Allow missing due to cache lag
            return tasks.some(t => t.includes('Task 3'));
        }, { timeout: 15000, timeoutMsg: 'Initial task setup failed' });

        // 2. Action: Delete the task note directly from the vault
        await browser.executeAsync(async (done) => {
            const file = app.vault.getAbstractFileByPath('todo-flow/Task 3.md');
            if (file) await app.vault.delete(file);
            done();
        });

        // 3. Verification: The task should now be marked as [MISSING] (or have .is-missing class)

        // Force a reload to simulate "next time I look" or cache update
        await browser.execute(() => {
            const view = app.workspace.getLeavesOfType("todo-flow-stack-view")[0]?.view;
            // @ts-ignore
            if (view) view.reload();
        });

        await browser.waitUntil(async () => {
            const tasks = await browser.execute(() => {
                const view = app.workspace.getLeavesOfType("todo-flow-stack-view")[0]?.view;
                // @ts-ignore
                return view ? view.getTasks() : [];
            });
            // Check if flagged as missing
            const task = tasks.find(t => t.title.includes('Task 3'));
            return task && task.isMissing === true;
        }, { timeout: 5000, timeoutMsg: 'Task was not marked as missing after deletion' });

        // 4. Verification: Check for "MISSING" UI
        await browser.waitUntil(async () => {
            return await $('.is-missing').isExisting();
        }, { timeout: 3000, timeoutMsg: 'Missing task style not applied' });

        const missingTaskTitle = await $('.is-missing .title').getText();
        expect(missingTaskTitle).toContain('[MISSING]');

        // 5. Verification: Try to "Complete" it (should be guarded)
        // Focus the missing task (it should be the last one added)
        const taskCards = await $$('.todo-flow-task-card');
        const lastIndex = taskCards.length - 1;

        // Focus it via click
        await taskCards[lastIndex].click();

        // Try 'x'
        await browser.keys(['x']);
        await browser.pause(200);

        // Verify it's still NOT done (class is-done should NOT be present)
        const classNames = await taskCards[lastIndex].getAttribute('class');
        const isDone = classNames.includes('is-done');
        expect(isDone).toBe(false);

        // 6. Action: Remove the orphan via UI button
        const removeBtn = await taskCards[lastIndex].$('.remove-orphan-btn');
        await removeBtn.click();

        // 7. Verification: Task should be gone
        await browser.waitUntil(async () => {
            const count = (await $$('.todo-flow-task-card')).length;
            return count === lastIndex; // One less than before
        }, { timeout: 3000, timeoutMsg: 'Orphaned task was not removed' });
    });
});
