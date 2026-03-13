import { browser, expect, $ } from '@wdio/globals';
import { scaffoldVault } from './e2e_utils.js';

describe('FEAT-019: Subtask List Visibility (v6 - Final Debug)', () => {
    
    async function waitForLinks(sourcePath: string, targetIds: string[]) {
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            const result = await browser.execute((src, targets) => {
                // @ts-ignore
                const cache = app.metadataCache;
                const links = cache.resolvedLinks[src];
                if (!links) return { success: false, reason: 'Source file not in resolvedLinks' };

                const linkKeys = Object.keys(links);
                const missing = targets.filter((t: string) => !linkKeys.some(k => k === t || k.endsWith(t) || k === t + '.md'));

                if (missing.length === 0) return { success: true };
                return { success: false, reason: `Missing: ${missing.join(', ')}`, found: linkKeys };
            }, sourcePath, targetIds);

            if (result.success) return true;
            return false;
        }, { timeout: 30000, timeoutMsg: `Links ${targetIds} not found in ${sourcePath}` });
    }

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
        await scaffoldVault('journey_c');
        
        // WAIT FOR INDEXING
        await waitForLinks('j3_gp.md', ['j3_p']);
        await waitForLinks('j3_p.md', ['j3_ca', 'j3_cb']);

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

    it('should show subtasks in DetailedTaskView and toggle their status', async () => {
        // 1. Activate stack for j3_gp.md
        // @ts-ignore
        await browser.execute((filePath: string) => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            plugin.activateStack(filePath);
        }, 'j3_gp.md');

        await waitForStackReady();

        // 2. Open Detailed View for Parent Task
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            if (view && view.component) {
                // @ts-ignore
                view.component.openDetailedView(0);
            }
        });

        // 3. Verify Detailed View is open
        const detailedView = await $('[data-testid="detailed-task-view"]');
        await detailedView.waitForDisplayed({ timeout: 5000 });

        // 4. Verify subtasks are visible
        const subtaskA = await $('[data-testid="subtask-title-0"]');
        await subtaskA.waitForExist({ timeout: 5000 });
        await expect(subtaskA).toHaveText('Child A');
        
        const subtaskB = await $('[data-testid="subtask-title-1"]');
        await subtaskB.waitForExist({ timeout: 5000 });
        await expect(subtaskB).toHaveText('Child B');

        // 5. Toggle status of Child A
        const checkboxA = await $('[data-testid="subtask-checkbox-0"]');
        await expect(checkboxA).toHaveText('○');
        await checkboxA.click();

        // 6. Verify status updated in UI
        await expect(checkboxA).toHaveText('●');
    });
});
