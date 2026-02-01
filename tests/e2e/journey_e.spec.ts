import { browser, expect, $, $$ } from '@wdio/globals';

describe('Journey E: Smart Imports', () => {
    beforeEach(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    async function createNote(path: string, content: string) {
        // @ts-ignore
        await browser.execute(async (p: string, c: string) => {
            // @ts-ignore
            if (!app.vault.getAbstractFileByPath(p)) {
                // @ts-ignore
                await app.vault.create(p, c);
            }
        }, path, content);
    }

    async function openFile(path: string) {
        // @ts-ignore
        await browser.execute((p: string) => {
            // @ts-ignore
            app.workspace.openLinkText(p, '', false);
        }, path);
        // @ts-ignore
        await browser.pause(500);
    }

    it('should bulk import linked files and avoid duplicates', async () => {
        // 1. Prepare test data
        await createNote('LinkedA.md', '# Linked A\n- [ ] Task A');
        await createNote('LinkedB.md', '# Linked B\n- [ ] Task B');
        await createNote('SourceNote.md', 'Check these out: [[LinkedA]] and [[LinkedB]]');

        // 2. Open Stack View (ensure it exists)
        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getLeavesOfType('todo-flow-stack-view').length > 0;
            });
        }, { timeout: 10000, timeoutMsg: 'Stack View did not open' });

        // 3. Wait for metadata cache to process links
        // @ts-ignore
        await browser.pause(2000);

        // 4. Open the Source Note
        await openFile('SourceNote.md');

        // Verify active file
        // @ts-ignore
        const activePath = await browser.execute(() => app.workspace.getActiveFile()?.path);
        console.log(`[Test] Active file: ${activePath}`);

        // 5. Trigger Smart Import command
        // Wait for metadata cache to see the links
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => {
                // @ts-ignore
                const links = app.metadataCache.resolvedLinks['SourceNote.md'];
                return links && Object.keys(links).length >= 2;
            });
        }, { timeout: 10000, timeoutMsg: 'Links never appeared in resolvedLinks' });

        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("todo-flow:add-linked-docs-to-stack")');

        // 6. Verify tasks are in the stack (wait for async import/reload)
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            const currentTasks = await browser.execute(() => {
                // @ts-ignore
                const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
                // @ts-ignore
                return view.getTasks().map(t => t.title);
            });
            return currentTasks.includes('Linked A') && currentTasks.includes('Linked B');
        }, { timeout: 10000, timeoutMsg: 'Tasks did not appear in stack after import' });

        // @ts-ignore
        const tasks = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            // @ts-ignore
            return view.getTasks().map(t => ({ title: t.title, path: t.id }));
        });

        console.log('[Test] Stack Tasks:', JSON.stringify(tasks));
        const titles = tasks.map((t: any) => t.title);

        expect(titles).toContain('Linked A');
        expect(titles).toContain('Linked B');
        console.log('[Test] ✅ Bulk Import works');

        // 7. Trigger again to verify duplicate avoidance
        const initialCount = titles.length;
        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("todo-flow:add-linked-docs-to-stack")');
        // @ts-ignore
        await browser.pause(1000);

        // @ts-ignore
        const newTitles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            // @ts-ignore
            return view.getTasks().map(t => t.title);
        });

        expect(newTitles.length).toBe(initialCount);
        console.log('[Test] ✅ Duplicate avoidance works');
    });
});
