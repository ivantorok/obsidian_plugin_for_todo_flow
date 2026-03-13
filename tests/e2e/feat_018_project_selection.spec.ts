import { browser, expect, $ } from '@wdio/globals';
import { scaffoldVault } from './e2e_utils.js';

describe('FEAT-018: Project/Folder Selection', () => {
    
    async function waitForStackReady() {
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => {
                // @ts-ignore
                const leaf = app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
                if (!leaf) return false;
                const view = leaf.view;
                // @ts-ignore
                return !!(view && view.component && view.getTasks().length > 0);
            });
        }, { timeout: 15000, timeoutMsg: 'Stack view component never became ready' });
    }

    beforeEach(async function () {
        await scaffoldVault('feat_018');
        
        // Enable debug
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            if (plugin) {
                plugin.settings.debug = true;
                plugin.saveSettings();
            }
        });
    });

    afterEach(async function() {
        // Capture logs
        // @ts-ignore
        const logs = await browser.execute(() => window._tf_log || []);
        console.log('[BROWSER LOGS]', JSON.stringify(logs, null, 2));
    });

    it('should move a task to a different folder via DetailedTaskView', async () => {
        // 1. Activate stack for folder_a
        // @ts-ignore
        await browser.execute((filePath: string) => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            plugin.activateStack(filePath);
        }, 'folder_a');

        await waitForStackReady();

        // 2. Open Detailed View for Task A
        // @ts-ignore
        const taskAId = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            const tasks = view?.getTasks() || [];
            const task = tasks.find((t: any) => t.title === 'Task A');
            if (view && view.component && tasks.length > 0) {
                // @ts-ignore
                view.component.openDetailedView(0);
            }
            return task?.id;
        });

        // 3. Verify Detailed View is open and shows folder_a
        const detailedView = await $('[data-testid="detailed-task-view"]');
        await detailedView.waitForDisplayed({ timeout: 5000 });

        const projectSelector = await $('[data-testid="project-selector"]');
        await expect(projectSelector).toHaveText(expect.stringContaining('folder_a'));

        // 4. Click Project Selector (Triggers logical move in test context)
        // Since native Obsidian modals are flaky in E2E, we'll verify the logical path.
        // We'll simulate the choice that would be made in the suggester.
        
        // @ts-ignore
        await browser.execute(async (taskId: string) => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            if (view && view.onProjectChange) {
                const tasks = view.getTasks();
                const index = tasks.findIndex((t: any) => t.id === taskId);
                const task = tasks[index];
                // @ts-ignore
                const folder = app.vault.getAbstractFileByPath('folder_b');
                if (task && folder) await view.onProjectChange(task, folder, index);
            }
        }, taskAId);

        // 5. Verify task moved (wait for index update)
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => {
                // @ts-ignore
                return app.vault.getAbstractFileByPath('folder_b/task_a.md') !== null;
            });
        }, { timeout: 10000, timeoutMsg: 'File did not move to folder_b' });

        // 7. Verify UI update
        await expect(projectSelector).toHaveText(expect.stringContaining('folder_b'));
    });
});
