import { browser, expect } from '@wdio/globals';
import { setupStackWithTasks } from './e2e_utils.js';

describe('BUG-009: Sync Overwrite & Refresh logic', () => {
    beforeEach(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        // Enable Debug Mode
        // @ts-ignore
        await browser.execute(() => app.commands.executeCommandById('todo-flow:toggle-dev-mode'));
    });

    afterEach(async function () {
        // @ts-ignore
        const logs = await browser.execute(() => window._logs || []);
        console.log('[Browser Logs]');
        // @ts-ignore
        logs.forEach(log => console.log(log));
    });

    it('should refresh the UI when CurrentStack.md is modified externally', async () => {
        // Verify Plugin is running
        // @ts-ignore
        const isPluginRunning = await browser.execute(() => {
            // @ts-ignore
            return app.plugins.plugins['todo-flow'] !== undefined;
        });
        console.log('[Test] Is Todo Flow running:', isPluginRunning);
        expect(isPluginRunning).toBe(true);

        // 1. Setup stack with 2 tasks
        await setupStackWithTasks(['Task 1', 'Task 2']);

        // 2. Explicitly activate as a file-backed stack (Mirroring "Open Daily Stack")
        await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            const tasks = view.getTasks();
            // @ts-ignore
            app.plugins.plugins['todo-flow'].activateStack(tasks.map(t => t.id), 'todo-flow/CurrentStack.md');
        });

        // Wait for activation and file creation
        await browser.pause(2000);

        // Verify initial count and file presence
        // @ts-ignore
        let tasks = await browser.execute(async () => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            // @ts-ignore
            const file = await app.vault.adapter.exists('todo-flow/CurrentStack.md');
            return {
                titles: view.getTasks().map(t => t.title),
                fileExists: file
            };
        });
        console.log('[Test] Initial state:', tasks);
        expect(tasks.titles.length).toBe(2);
        expect(tasks.fileExists).toBe(true);

        // Capture first task ID
        // @ts-ignore
        const taskId = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].id;
        });

        // 3. Simulate External Edit to CurrentStack.md (remove one task)
        // We wait 2.5s to ensure we bypass the 2s "internal write" heuristic in StackPersistenceService.
        await browser.pause(2500);

        const newContent = `[[${taskId}]]`;

        // @ts-ignore
        await browser.execute(async (path, content) => {
            // @ts-ignore
            const file = app.vault.getAbstractFileByPath(path);
            // @ts-ignore
            window._logs = window._logs || [];
            if (file) {
                // @ts-ignore
                await app.vault.modify(file, content);
                // @ts-ignore
                window._logs.push(`[Test] Modified ${path} via vault.modify. New content: ${content}`);
            } else {
                // @ts-ignore
                window._logs.push(`[Test] ERROR: Could not find ${path}`);
            }
        }, 'todo-flow/CurrentStack.md', newContent);

        // 3. Wait for watcher and debounce (500ms in code + some extra)
        // We'll wait longer
        await browser.pause(5000);

        // Check file content after modification
        // @ts-ignore
        const actualFileContent = await browser.execute(async (path) => {
            // @ts-ignore
            const file = app.vault.getAbstractFileByPath(path);
            // @ts-ignore
            return file ? await app.vault.read(file) : 'FILE NOT FOUND';
        }, 'todo-flow/CurrentStack.md');
        console.log('[Test] Actual file content on disk:', actualFileContent);

        // 4. Verification: UI should now only have 1 task
        // @ts-ignore
        tasks = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks().map(t => t.title);
        });

        console.log('[Test] Final tasks in UI:', tasks);

        // If BUG-009 is present, this would be 2 (stale state restored from memory)
        expect(tasks.length).toBe(1);
        console.log('[Test] ✅ Sync Refresh (BUG-009) verified successfully');
    });
});
