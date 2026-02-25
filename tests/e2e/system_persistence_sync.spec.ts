import { browser, expect, $, $$ } from '@wdio/globals';

describe('System: Persistence and Syncing [DETERMINISTIC]', () => {
    const TEST_FILE = 'system_persistence_sync.md';

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
            let content = `---
startTime: ${new Date().toISOString()}
---
# Test Stack\n\n`;
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
        await browser.pause(5000);
    });

    beforeEach(async function () {
        // 1. Cleanup: Close all existing leaves
        await browser.execute(() => {
            // @ts-ignore
            app.workspace.getLeavesOfType('todo-flow-stack-view').forEach(leaf => leaf.detach());
        });

        // 2. Open the SPECIFIC stack file
        await browser.execute(async (path) => {
            // @ts-ignore
            const plugin = app.plugins.getPlugin('todo-flow');
            await plugin.activateStack([], path);
        }, TEST_FILE);

        const container = await $('[data-testid="stack-view-container"]');
        await container.waitForExist({ timeout: 15000 });
        await waitForPersistenceIdle();
    });

    it('should refresh the UI when the stack file is modified externally', async () => {
        // 1. Setup 2 tasks
        await setupStackOnDisk([
            { id: 'task-a.md', title: 'Task A', status: 'todo' },
            { id: 'task-b.md', title: 'Task B', status: 'todo' }
        ]);
        await waitForPersistenceIdle();

        const container = await $('[data-testid="stack-view-container"]');

        // Wait for exactly 2 tasks
        await browser.waitUntil(async () => {
            return (await container.getAttribute('data-task-count')) === '2';
        }, { timeout: 10000 });

        // 2. External Modification: Remove Task B
        await setupStackOnDisk([
            { id: 'task-a.md', title: 'Task A', status: 'todo' }
        ]);
        await waitForPersistenceIdle();

        // 3. Verify UI reflects the removal
        await browser.waitUntil(async () => {
            return (await container.getAttribute('data-task-count')) === '1';
        }, { timeout: 10000, timeoutMsg: 'Task B was not removed after disk update' });

        const taskB = await $('.todo-flow-task-card*=Task B');
        expect(await taskB.isExisting()).toBe(false);
    });

    it('should reflect item swaps performed on disk', async () => {
        // 1. Setup Task A and Task B
        await setupStackOnDisk([
            { id: 'task-a.md', title: 'Task A', status: 'todo' },
            { id: 'task-b.md', title: 'Task B', status: 'todo' }
        ]);
        await waitForPersistenceIdle();

        const container = await $('[data-testid="stack-view-container"]');
        await expect(container).toHaveAttribute('data-task-count', '2');

        // 2. Swap A and B on disk
        await setupStackOnDisk([
            { id: 'task-b.md', title: 'Task B', status: 'todo' },
            { id: 'task-a.md', title: 'Task A', status: 'todo' }
        ]);
        await waitForPersistenceIdle();

        // 3. Verify Order in UI
        const taskCards = await container.$$('.todo-flow-task-card');
        await browser.waitUntil(async () => {
            const cards = await container.$$('.todo-flow-task-card');
            if (cards.length !== 2) return false;
            const text0 = await cards[0]!.getText();
            return text0.includes('Task B');
        }, { timeout: 10000, timeoutMsg: 'Task swap not reflected in UI' });

        expect(await taskCards[0]!.getText()).toContain('Task B');
        expect(await taskCards[1]!.getText()).toContain('Task A');
    });
});
