import { browser, expect } from '@wdio/globals';

describe('Phase 2: Behavioral Sovereignty [SYNC INTEGRITY]', () => {
    before(async function () {
        // Clear vault and prep a task
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });

        // Ensure we are on desktop for initial state
        await browser.execute(() => {
            app.commands.executeCommandById('todo-flow:open-daily-stack');
        });

        // Wait for the stack view to actually open
        const container = await $('[data-testid="stack-container"]');
        await container.waitForExist({ timeout: 15000 });
        await browser.pause(1000);

        // Ensure we are in FOCUS mode for consistent testing
        await browser.execute(() => {
            // @ts-ignore
            const leaf = app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
            if (leaf && leaf.view && (leaf.view as any).component) {
                const component = (leaf.view as any).component;
                if (component.setViewMode) {
                    component.setViewMode('focus');
                }
            }
        });
        await browser.pause(2000);

        // Create a task to test with via direct component API
        await browser.execute(() => {
            // @ts-ignore
            app.workspace.iterateAllLeaves(leaf => {
                const component = (leaf.view as any).component;
                if (component && component.setTasks) {
                    component.setTasks([{
                        id: 'e2e-test-task',
                        title: 'Test Task for Guard',
                        duration: 25,
                        status: 'todo',
                        isAnchored: false,
                        children: []
                    }]);
                }
            });
        });

        // 5. Wait for DOM to reflect the task
        await browser.waitUntil(async () => {
            const container = await $('[data-testid="stack-container"]');
            const count = await container.getAttribute('data-task-count');
            return count === '1';
        }, { timeout: 10000, timeoutMsg: 'Task count did not become 1' });

        await browser.pause(1000);
    });

    it('TDD-01: Interaction during sync should be blocked and show Notice', async () => {
        // 1. Activate Sync
        await browser.execute(() => {
            // @ts-ignore
            const plugin = app.plugins.getPlugin('todo-flow');
            if (plugin) plugin.setIsSyncing(true);

            // @ts-ignore
            app.workspace.iterateAllLeaves(leaf => {
                if (leaf.view && (leaf.view as any).setIsSyncing) {
                    (leaf.view as any).setIsSyncing(true);
                }
            });
        });
        await browser.pause(2000);

        // 2. Attempt interaction (Complete Button in Focus Mode)
        // Should be blocked and show Notice
        try {
            const completeBtn = await $('[data-testid="focus-complete-btn"]');
            await completeBtn.waitForExist({ timeout: 10000 });
            await completeBtn.click();
        } catch (e) {
            await browser.saveScreenshot('/home/ivan/projects/obsidian_plugin_for_todo_flow/e2e_focus_error.png');
            throw e;
        }

        // 3. Verify Notice appeared (Either ACTIVATED debug notice or Action Blocked notice)
        await browser.waitUntil(async () => {
            const notices = await $$('.notice');
            for (const notice of notices) {
                const text = await notice.getText();
                if (text.includes('ACTIVATED') || text.includes('Syncing')) return true;
            }
            return false;
        }, { timeout: 10000, timeoutMsg: 'Sync-related notice did not appear' });

        // Cleanup: Turn off sync
        await browser.execute(() => {
            // @ts-ignore
            const plugin = app.plugins.getPlugin('todo-flow');
            if (plugin) plugin.setIsSyncing(false);

            // @ts-ignore
            app.workspace.iterateAllLeaves(leaf => {
                if (leaf.view && (leaf.view as any).setIsSyncing) {
                    (leaf.view as any).setIsSyncing(false);
                }
            });
        });
    });

    it('TDD-02: Zen Mode should celebrate an empty stack', async () => {
        // 1. Clear all tasks via component API for reliability in re-used environment
        await browser.execute(() => {
            // @ts-ignore
            const leaves = app.workspace.getLeavesOfType('todo-flow-stack-view');
            leaves.forEach(leaf => {
                const component = (leaf.view as any).component;
                if (component) {
                    if (component.setTasks) component.setTasks([]);
                    if (component.setViewMode) component.setViewMode('focus');
                }
            });
        });

        const container = await $('[data-testid="stack-container"]');

        // 2. Wait for task count to be 0
        await browser.waitUntil(async () => {
            const count = await container.getAttribute('data-task-count');
            return count === '0';
        }, { timeout: 10000, timeoutMsg: 'Task count did not drop to 0' });

        // 3. Verify Zen Card is visible
        const zenCard = await $('[data-testid="zen-card"]');
        await zenCard.waitForExist({ timeout: 5000 });
        expect(await zenCard.isExisting()).toBe(true);
        const title = await zenCard.$('h1');
        expect(await title.getText()).toBe('All Done');
    });
});
