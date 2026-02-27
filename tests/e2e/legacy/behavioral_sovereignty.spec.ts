import { browser, expect, $, $$ } from '@wdio/globals';

describe('Phase 2: Behavioral Sovereignty [SYNC INTEGRITY]', () => {
    const TEST_FILE = 'behavioral_sovereignty.md';

    async function waitForPersistenceIdle() {
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => {
                const container = document.querySelector('.todo-flow-stack-container');
                return container?.getAttribute('data-persistence-idle') === 'true';
            });
        }, {
            timeout: 15000,
            timeoutMsg: 'Timed out waiting for persistence to become idle'
        });
    }

    async function setupStackOnDisk(tasks: { id: string, title: string, status: string }[]) {
        // @ts-ignore
        await browser.execute(async (tasksToSave, targetPath) => {
            // 1. Create task files
            for (const t of tasksToSave) {
                const path = t.id.endsWith('.md') ? t.id : `${t.id}.md`;
                const statusLine = t.status === 'done' ? 'status: done\n' : '';
                // @ts-ignore
                const existing = app.vault.getAbstractFileByPath(path);
                if (existing) {
                    // @ts-ignore
                    await app.vault.modify(existing, `# ${t.title}\n\nduration: 25\n${statusLine}`);
                } else {
                    // @ts-ignore
                    await app.vault.create(path, `# ${t.title}\n\nduration: 25\n${statusLine}`);
                }
            }

            // 2. Format content
            let content = `---\nstartTime: ${new Date().toISOString()}\n---\n# Test Stack\n\n`;
            for (const t of tasksToSave) {
                const checkbox = t.status === 'done' ? '[x]' : '[ ]';
                content += `- ${checkbox} [[${t.id}]]\n`;
            }

            // 3. Write to disk
            // @ts-ignore
            const file = app.vault.getAbstractFileByPath(targetPath);
            if (file) {
                // @ts-ignore
                await app.vault.modify(file, content);
            } else {
                // @ts-ignore
                await app.vault.create(targetPath, content);
            }
        }, tasks, TEST_FILE);
    }

    before(async function () {
        // Init Obsidian once
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        // @ts-ignore
        await browser.pause(10000);

        // Aggressive Cleanup: Ensure no stale state from previous specs
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            const plugin = app.plugins.getPlugin('todo-flow');
            if (plugin) {
                plugin.setIsSyncing(false);
            }
            // @ts-ignore
            app.workspace.iterateAllLeaves(leaf => {
                if (leaf.view && leaf.view.getViewType() === 'todo-flow-stack-view') {
                    leaf.detach();
                }
            });
        });
    });

    beforeEach(async function () {
        // 1. Cleanup: Close all existing leaves
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            app.workspace.getLeavesOfType('todo-flow-stack-view').forEach(leaf => leaf.detach());
        });

        // 2. Open the SPECIFIC stack file
        // @ts-ignore
        await browser.execute(async (path) => {
            // @ts-ignore
            const plugin = app.plugins.getPlugin('todo-flow');
            await plugin.activateStack([], path);
        }, TEST_FILE);

        const container = await $('[data-testid="stack-view-container"]');
        await container.waitForExist({ timeout: 15000 });

        // 3. Ensure Focus mode with retries and readiness check
        await browser.waitUntil(async () => {
            const ready = await browser.execute(() => {
                // @ts-ignore
                const leaves = app.workspace.getLeavesOfType('todo-flow-stack-view');
                const leaf = leaves[0];
                if (leaf && leaf.view) {
                    const view = leaf.view as any;
                    // Check if both view class and svelte component are ready
                    if (view.setViewMode && view.component) {
                        view.setViewMode('focus');
                        return true;
                    }
                }
                return false;
            });
            if (!ready) return false;

            // Verification
            const mode = await container.getAttribute('data-view-mode');
            return mode === 'focus';
        }, { timeout: 15000, interval: 1000, timeoutMsg: 'Failed to switch to focus mode after retries' });

        await waitForPersistenceIdle();
    });

    afterEach(async function () {
        // Reset sync state to avoid leaks
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

    it('TDD-01: Interaction during sync should be blocked and show Notice', async () => {
        // 1. Setup 1 task on disk
        await setupStackOnDisk([{ id: 'test-task-1', title: 'Test Task 1', status: 'todo' }]);
        await browser.pause(1000);
        await waitForPersistenceIdle();

        // 2. Activate Sync
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

        // Wait for marker to reflect syncing
        const container = await $('[data-testid="stack-view-container"]');
        await browser.waitUntil(async () => {
            return (await container.getAttribute('data-is-syncing')) === 'true';
        }, { timeout: 5000 });

        // 3. Attempt interaction (Complete Button in Focus Mode)
        const completeBtn = await $('[data-testid="focus-complete-btn"]');
        await completeBtn.click();
        await browser.pause(500); // Give notice time to appear

        // 4. Verify Notice
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => {
                const notices = document.querySelectorAll('.notice');
                return Array.from(notices).some(n => n.textContent?.includes('Syncing'));
            });
        }, { timeout: 10000, timeoutMsg: 'Sync-related notice did not appear' });
    });

    it('TDD-02: Zen Mode should celebrate an empty stack', async () => {
        // 1. Start with 1 task
        await setupStackOnDisk([{ id: 'zen-test-task', title: 'Zen Test Task', status: 'todo' }]);
        await browser.pause(1000);
        await waitForPersistenceIdle();

        const container = await $('[data-testid="stack-view-container"]');
        await browser.waitUntil(async () => {
            return (await container.getAttribute('data-task-count')) === '1';
        }, { timeout: 10000 });

        // 2. Clear stack on disk
        await setupStackOnDisk([]);
        await browser.pause(1000);
        await waitForPersistenceIdle();

        // 3. Wait for task count to be 0
        await browser.waitUntil(async () => {
            const count = await container.getAttribute('data-task-count');
            return count === '0';
        }, { timeout: 10000, timeoutMsg: 'Task count did not drop to 0' });

        // 4. Verify Zen Card is visible
        const zenCard = await $('.zen-card');
        await zenCard.waitForExist({ timeout: 10000 });

        const title = await $('.zen-title');
        expect(await title.getText()).toBe('All Done');
    });
});
