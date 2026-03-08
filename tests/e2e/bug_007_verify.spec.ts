import { browser, expect, $ } from '@wdio/globals';
import { setupStackWithTasks } from './e2e_utils.js';

/**
 * Hardened BUG-007 spec (v42 — Sync Fortress).
 *
 * Replaces CSS .title selector with view.getTasks() API,
 * replaces browser.pause with waitUntil + data-persistence-idle polling.
 */
describe('BUG-007: Sync External Task Edit Refresh (Hardened)', () => {
    beforeEach(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    it('should refresh the UI when an individual task file is modified externally', async function () {
        this.timeout(180000);

        // 1. Setup stack with 2 tasks
        console.log('[Test] Step 1: Setting up stack with tasks...');
        await setupStackWithTasks(['Original Title', 'Task 2']);

        // Wait for tasks to be rendered (use view API, not CSS selectors)
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => {
                // @ts-ignore
                const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
                if (!view) return false;
                return view.getTasks().length === 2;
            });
        }, { timeout: 15000, timeoutMsg: 'Tasks did not appear in Stack after setup' });
        console.log('[Test] Stack setup complete with 2 tasks.');

        // Enable debug mode
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            const plugin = app.plugins.getPlugin('todo-flow');
            if (plugin) {
                plugin.settings.debug = true;
                plugin.saveSettings();
                plugin.logger.setEnabled(true);
            }
        });

        // Capture the first task ID
        // @ts-ignore
        const { taskId, allFiles } = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return {
                taskId: view.getTasks()[0].id,
                allFiles: app.vault.getFiles().map((f: any) => f.path)
            };
        });
        console.log('[Test] Target Task ID:', taskId);
        console.log('[Test] All Vault Files:', allFiles);

        // Verify initial title via view API (not CSS selector)
        // @ts-ignore
        const initialTitle = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            return view.getTasks()[0]?.title;
        });
        expect(initialTitle).toBe('Original Title');

        // Initialize browser logs
        await browser.execute(() => { (window as any)._logs = []; });

        // 2. Wait for persistence idle BEFORE simulating external edit
        console.log('[Test] Step 2: Waiting for persistence idle before external edit...');
        const container = await $('.todo-flow-stack-container');
        // @ts-ignore
        await browser.waitUntil(async () => {
            const idle = await container.getAttribute('data-persistence-idle');
            return idle === 'true';
        }, { timeout: 15000, timeoutMsg: 'Persistence never reached idle state before external edit' });

        const newTitle = 'Updated via Sync';
        console.log(`[Test] Modifying file ${taskId} to "${newTitle}"`);

        // @ts-ignore
        await browser.execute(async (path: string, title: string) => {
            const file = app.vault.getAbstractFileByPath(path);
            if (file) {
                // @ts-ignore
                const plugin = app.plugins.getPlugin('todo-flow');
                if (plugin) plugin.logger.info(`[Test] External modify start on ${path}`);

                // Use adapter.write to simulate external sync
                await app.vault.adapter.write(path, title);
                (window as any)._logs.push(`[Test] Modified ${path} via vault.adapter.write`);
                if (plugin) plugin.logger.info(`[Test] External modify end on ${path}`);
            } else {
                (window as any)._logs.push(`[Test] Error: File ${path} not found for modification`);
            }
        }, taskId, newTitle);
        console.log('[Test] File modification initiated.');

        // 3. Wait for UI to reflect the change (via view API, not CSS selector)
        console.log('[Test] Step 3: Waiting for UI to update via view API...');

        try {
            // @ts-ignore
            await browser.waitUntil(async () => {
                // @ts-ignore
                return await browser.execute((expected: string) => {
                    // @ts-ignore
                    const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
                    if (!view) return false;
                    const tasks = view.getTasks();
                    if (tasks.length === 0) return false;
                    return tasks[0].title === expected;
                }, newTitle);
            }, {
                timeout: 15000,
                interval: 500,
                timeoutMsg: `UI did not update to "${newTitle}" after 15s`
            });

            // @ts-ignore
            const finalTitle = await browser.execute(() => {
                // @ts-ignore
                const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
                return view.getTasks()[0]?.title;
            });
            console.log('[Test] UI Title after sync:', finalTitle);
            expect(finalTitle).toBe(newTitle);
            console.log('[Test] ✅ Sync Refresh (BUG-007) verified successfully');
        } catch (e) {
            console.error('[Test] ❌ Verification Failed:', e);
            throw e;
        } finally {
            // Diagnostic logs
            const logs = await browser.execute(() => (window as any)._logs || []);
            console.log('[Browser Logs]', logs);

            // @ts-ignore
            const fileLogs = await browser.execute(async () => {
                try {
                    const content = await app.vault.adapter.read('logs/todo-flow.log');
                    return content;
                } catch (e) {
                    return 'Log file not found or unreadable';
                }
            });
            console.log('[Plugin File Logs]\n', fileLogs);
        }
    });
});
