import { browser, expect, $ } from '@wdio/globals';
import fs from 'fs';
import path from 'path';

describe('Substack Navigation & Rollup Journey', () => {
    const vaultPath = path.resolve(process.cwd(), '.test-vault');
    const fixturesPath = path.resolve(process.cwd(), 'tests/fixtures/substack');

    async function setupFixtures() {
        if (!fs.existsSync(vaultPath)) {
            fs.mkdirSync(vaultPath, { recursive: true });
        }
        const files = ['root.md', 'parent.md', 'child_task_1.md', 'child_task_2.md'];
        for (const file of files) {
            const src = path.join(fixturesPath, file);
            const dest = path.join(vaultPath, file);
            fs.copyFileSync(src, dest);
        }
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
                return !!(view && view.component && view.getTasks().length > 0);
            });
        }, { timeout: 15000, timeoutMsg: 'Stack view component never became ready' });
    }

    async function waitForLinks(sourcePath: string, targetIds: string[]) {
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            const result = await browser.execute((src, targets) => {
                // @ts-ignore
                const cache = app.metadataCache;
                const links = cache.resolvedLinks[src];
                if (!links) return { success: false };
                const linkKeys = Object.keys(links);
                const missing = targets.filter((t: string) => !linkKeys.some(k => k === t || k.endsWith(t)));
                return { success: missing.length === 0 };
            }, sourcePath, targetIds);
            return result.success;
        }, { timeout: 10000 });
    }

    beforeEach(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await setupFixtures();

        // Enable debug and initialize trace variables
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            window._tf_log = window._tf_log || [];
            // @ts-ignore
            window._tf_last_tasks = window._tf_last_tasks || null;
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            if (plugin) {
                plugin.settings.debug = true;
                plugin.saveSettings();
            }
        });

        await waitForLinks('root.md', ['parent.md']);
        await waitForLinks('parent.md', ['child_task_1.md', 'child_task_2.md']);
    });

    it('should show subtask indicator and drill down on click', async () => {
        // 1. Activate parent stack
        // @ts-ignore
        await browser.execute((filePath: string) => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            plugin.activateStack(filePath);
        }, 'root.md');

        await waitForStackReady();

        // 2. Verify subtask indicator presence for "parent" in Architect (Root)
        try {
            await expect($('.substack-indicator')).toBePresent();
        } catch (e) {
            const debugTasks = await browser.execute(() => (window as any)._tf_last_tasks);
            const debugLog = await browser.execute(() => (window as any)._tf_log);
            console.error('--- E2E DEBUG: window._tf_last_tasks ---');
            console.error(JSON.stringify(debugTasks, null, 2));
            console.error('--- E2E DEBUG: window._tf_log ---');
            console.error(JSON.stringify(debugLog, null, 2));
            console.error('----------------------------------------');
            throw e;
        }

        const indicator = await $('.substack-indicator');
        const countText = await indicator.$('.count').getText();
        expect(countText).toBe('2');

        // 3. Verify duration rollup (Parent: 0 + Child1: 10 + Child2: 20 = 30m)
        const durationText = await $('.todo-flow-task-card .duration-text').getText();
        expect(durationText).toBe('30m');

        // 4. Click the indicator to drill down
        await indicator.click();

        // 5. Verify we are inside the subtasks
        // @ts-ignore
        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                // @ts-ignore
                const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
                return view?.getTasks().some((t: any) => t.title === 'Child 1');
            });
        }, { timeout: 5000, timeoutMsg: 'Subtasks not loaded after clicking indicator' });

        // 6. Verify back button in header
        const backBtn = await $('[data-testid="back-nav-btn"]');
        await expect(backBtn).toBePresent();
        await backBtn.click();

        // 7. Verify we are back at the parent level
        // @ts-ignore
        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                // @ts-ignore
                const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
                return view?.getTasks().some((t: any) => t.title === 'Parent Task');
            });
        }, { timeout: 5000, timeoutMsg: 'Failed to navigate back to parent' });
    });

    it('should show subtask indicator in Focus mode', async () => {
        // 1. Activate parent stack
        // @ts-ignore
        await browser.execute((filePath: string) => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            plugin.activateStack(filePath);
        }, 'root.md');

        await waitForStackReady();

        // 2. Switch to Focus mode
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            view.setViewMode('focus');
        });

        // 3. Verify subtask indicator presence in Focus
        try {
            await expect($('.substack-indicator.focus-mode')).toBePresent();
        } catch (e) {
            const debugTasks = await browser.execute(() => (window as any)._tf_last_tasks);
            console.error('--- E2E DEBUG Focus: window._tf_last_tasks ---');
            console.error(JSON.stringify(debugTasks, null, 2));
            console.error('----------------------------------------------');
            throw e;
        }

        const focusIndicator = await $('.substack-indicator.focus-mode');
        const focusCountText = await focusIndicator.$('.count').getText();
        expect(focusCountText).toContain('2 subtasks');

        // 4. Click the focus indicator to drill down
        await focusIndicator.click();

        // 5. Verify subtasks visible in Focus mode
        // @ts-ignore
        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                // @ts-ignore
                const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
                const tasks = view?.getTasks() || [];
                return tasks.some((t: any) => t.title === 'Child 1');
            });
        }, { timeout: 5000, timeoutMsg: 'Focus mode subtasks not loaded after click' });
    });
});
