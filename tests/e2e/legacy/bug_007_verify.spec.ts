import { browser, expect, $, $$ } from '@wdio/globals';
import { setupStackWithTasks } from './e2e_utils.js';

describe('BUG-007: Sync External Task Edit Refresh', () => {
    beforeEach(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    it('should refresh the UI when an individual task file is modified externally', async () => {
        // 1. Setup stack with 2 tasks
        console.log('[Test] Step 1: Setting up stack with tasks...');
        await setupStackWithTasks(['Original Title', 'Task 2']);

        // Wait for tasks to be rendered
        await browser.waitUntil(async () => {
            const cards = await $$('.todo-flow-task-card');
            return cards.length === 2;
        }, { timeout: 10000, timeoutMsg: 'Tasks did not appear in Stack after setup' });
        console.log('[Test] Stack setup complete with 2 tasks.');

        // Enable debug mode in the plugin for this test
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

        // Capture the first task ID (which is the file path)
        // @ts-ignore
        const { taskId, allFiles } = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return {
                taskId: view.getTasks()[0].id,
                allFiles: app.vault.getFiles().map(f => f.path)
            };
        });
        console.log('[Test] Target Task ID:', taskId);
        console.log('[Test] All Vault Files:', allFiles);

        // Verify initial title in UI
        const firstTaskTitle = await $('.todo-flow-task-card .title');
        expect(await firstTaskTitle.getText()).toBe('Original Title');

        // Initialize logs
        await browser.execute(() => { (window as any)._logs = []; });
        console.log('[Test] Browser logs initialized.');

        // 2. Simulate External Edit to the task file
        // We wait 3s to bypass the 2s "internal write" heuristic safely
        console.log('[Test] Step 2: Pausing for 3s to bypass internal write heuristic...');
        await browser.pause(3000);
        console.log('[Test] Pause complete.');

        const newTitle = 'Updated via Sync';
        console.log(`[Test] Modifying file ${taskId} to "${newTitle}"`);
        // We need to update the file content. 
        // @ts-ignore
        await browser.execute(async (path, title) => {
            const file = app.vault.getAbstractFileByPath(path);
            if (file) {
                // @ts-ignore
                const plugin = app.plugins.getPlugin('todo-flow');
                if (plugin) plugin.logger.info(`[Test] External modify start on ${path}`);

                // Use adapter.write to simulate external sync more accurately
                await app.vault.adapter.write(path, title);
                (window as any)._logs.push(`[Test] Modified ${path} via vault.adapter.write`);
                if (plugin) plugin.logger.info(`[Test] External modify end on ${path}`);
            } else {
                (window as any)._logs.push(`[Test] Error: File ${path} not found for modification`);
            }
        }, taskId, newTitle);
        console.log('[Test] File modification initiated.');

        // 3. Wait for watcher and reload
        console.log('[Test] Step 3: Waiting for UI to update... (Pausing 3s for re-index)');
        await browser.pause(3000);

        try {
            await browser.waitUntil(async () => {
                const titleElement = await $('.todo-flow-task-card .title');
                if (await titleElement.isExisting()) {
                    const text = await titleElement.getText();
                    return text === newTitle;
                }
                return false;
            }, {
                timeout: 10000,
                interval: 500,
                timeoutMsg: `UI did not update to "${newTitle}" after 10s`
            });

            const text = await $('.todo-flow-task-card .title').getText();
            console.log('[Test] UI Title after sync:', text);
            expect(text).toBe(newTitle);
            console.log('[Test] ✅ Sync Refresh (BUG-007) verified successfully');
        } catch (e) {
            console.error('[Test] ❌ Verification Failed:', e);
            throw e;
        } finally {
            // Use browser logs for diagnostics if it fails
            const logs = await browser.execute(() => (window as any)._logs || []);
            console.log('[Browser Logs]', logs);

            // Also check todo-flow.log if it exists
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

            const modifyLogs = await browser.execute(async () => {
                try {
                    return await app.vault.adapter.read('logs/modify-detected.txt');
                } catch (e) {
                    return 'Modify detection log not found';
                }
            });
            console.log('[Smoke Signal] Modify Detected:\n', modifyLogs);

            const reloadLogs = await browser.execute(async () => {
                try {
                    return await app.vault.adapter.read('logs/reload-triggered.txt');
                } catch (e) {
                    return 'Reload trigger log not found';
                }
            });
            console.log('[Smoke Signal] Reload Triggered:\n', reloadLogs);
        }
    });
});
