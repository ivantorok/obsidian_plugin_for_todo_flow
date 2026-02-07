import { browser, expect, $, $$ } from '@wdio/globals';

describe('Sync & Persistence: Atomic Scenarios (Isolated)', () => {

    beforeEach(async function () {
        // Start with a fresh Obsidian load
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        // Wait 3 seconds for Obsidian to settle
        await browser.pause(3000);
    });

    /**
     * Helper to pre-populate the vault before running UI commands
     */
    async function prePopulateVault(tasks: { title: string, id: string }[]) {
        await browser.executeAsync(async (taskData, done) => {
            // @ts-ignore
            const adapter = app.vault.adapter;

            // Create folder if missing
            if (!(await adapter.exists('todo-flow'))) {
                await adapter.mkdir('todo-flow');
            }

            // Create individual task files
            for (const task of taskData) {
                const content = `---\ntask: ${task.title}\nstatus: todo\nduration: 30\n---\n# ${task.title}`;
                if (await adapter.exists(task.id)) {
                    await adapter.write(task.id, content);
                } else {
                    // @ts-ignore
                    await app.vault.create(task.id, content);
                }
            }

            // Create CurrentStack.md
            const stackContent = `# Current Stack\n\n` + taskData.map(t => `- [ ] [[${t.id}]]`).join('\n');
            if (await adapter.exists('todo-flow/CurrentStack.md')) {
                await adapter.write('todo-flow/CurrentStack.md', stackContent);
            } else {
                // @ts-ignore
                await app.vault.create('todo-flow/CurrentStack.md', stackContent);
            }
            done();
        }, tasks);
        // Wait for Obsidian to index these new files
        await browser.pause(2000);
    }

    it('should reflect archived tasks after running Open Daily Stack command (Slow Pace)', async () => {
        // 1. Setup: Pre-populate files BEFORE interacting with UI
        const tasks = [
            { title: 'Alpha Task', id: 'todo-flow/Alpha.md' },
            { title: 'Beta Task', id: 'todo-flow/Beta.md' },
            { title: 'Gamma Task', id: 'todo-flow/Gamma.md' }
        ];
        await prePopulateVault(tasks);

        // 2. Open Daily Stack command
        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');
        await browser.pause(2000); // Wait for view to render

        // 3. Verify initial state in UI
        let cards = await $$('.todo-flow-task-card');
        expect(cards.length).toBe(3);

        // 4. Interaction: Archive Beta (the middle one)
        // Focus container first
        await browser.execute(() => {
            const container = document.querySelector('.todo-flow-stack-container') as HTMLElement;
            if (container) container.focus();
        });
        await browser.pause(1000);

        // j to move to Beta, z to archive
        // @ts-ignore
        await browser.keys(['j']);
        await browser.pause(1000);
        // @ts-ignore
        await browser.keys(['z']);
        await browser.pause(1000);

        // Verify it disappeared from UI
        cards = await $$('.todo-flow-task-card');
        expect(cards.length).toBe(2);

        // 5. Reload: Re-run Open Daily Stack command
        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');
        await browser.pause(2000);

        // 6. Verification: Beta should NOT reappear because CurrentStack.md was updated on disk
        const currentTasks = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            // @ts-ignore
            return view ? view.getTasks().map(t => t.title) : [];
        });

        console.log(`[Slow Test] Final Stack: ${JSON.stringify(currentTasks)}`);

        const trace = await browser.execute(() => {
            // @ts-ignore
            return window._history_trace || [];
        });
        console.log(`[Slow Test] History Trace: ${JSON.stringify(trace)}`);

        expect(currentTasks).toContain('Alpha Task');
        expect(currentTasks).toContain('Gamma Task');
        expect(currentTasks).not.toContain('Beta Task');
        expect(currentTasks.length).toBe(2);
    });

    it('should refresh UI automatically when CurrentStack.md is modified externally (Slow Pace)', async () => {
        // 1. Setup: Start with 1 task
        const initialTask = [{ title: 'Main Task', id: 'todo-flow/Main.md' }];
        await prePopulateVault(initialTask);

        // 2. Open Daily Stack
        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');
        await browser.pause(2000);

        // 3. Force plugin to treat next write as external
        await browser.execute(() => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            if (plugin?.stackPersistenceService) {
                plugin.stackPersistenceService.lastInternalWriteTime = 0;
            }
        });
        await browser.pause(1000);

        // 4. External Modification: Write via Adapter (Sync simulation)
        await browser.executeAsync(async (done) => {
            // @ts-ignore
            const adapter = app.vault.adapter;
            // @ts-ignore
            await app.vault.create('todo-flow/SyncTask.md', '# Sync Task');
            const content = await adapter.read('todo-flow/CurrentStack.md');
            await adapter.write('todo-flow/CurrentStack.md', content + '\n- [ ] [[todo-flow/SyncTask.md]]');
            done();
        });

        // 5. Wait for the "Magic" (Watcher -> Refresh)
        // Give it 3 seconds to detect and reload
        await browser.pause(3000);

        // 6. Verification
        const cards = await $$('.todo-flow-task-card');
        const cardTexts = [];
        for (const card of cards) {
            cardTexts.push(await card.getText());
        }
        console.log(`[Slow Test] UI Texts after sync: ${JSON.stringify(cardTexts)}`);

        expect(cardTexts.some(t => t.includes('Sync Task'))).toBe(true);
        expect(cards.length).toBe(2);
    });
});
