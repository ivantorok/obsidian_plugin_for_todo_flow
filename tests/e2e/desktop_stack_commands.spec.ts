import { browser, expect, $ } from '@wdio/globals';
import * as path from 'path';

describe('Application Command Verification Batch 1 (AC-06 to AC-09)', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    it('AC-06: clear-daily-stack', async () => {
        // 1. Setup a non-empty stack
        await browser.execute(async () => {
            const adapter = app.vault.adapter;
            if (!(await adapter.exists('todo-flow'))) {
                await adapter.mkdir('todo-flow');
            }
            if (!(await adapter.exists('todo-flow/Task1.md'))) {
                await app.vault.create('todo-flow/Task1.md', '# Task 1');
            }
            await app.vault.adapter.write('todo-flow/CurrentStack.md', '# Current Stack\n\n- [ ] [[todo-flow/Task1.md]]');
        });

        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');
        await $('.todo-flow-stack-container').waitForExist({ timeout: 5000 });

        // 2. Trigger Clear Command
        // We need to override window.confirm to auto-accept in E2E
        await browser.execute(() => {
            window.confirm = () => true;
            app.commands.executeCommandById('todo-flow:clear-daily-stack');
        });

        await browser.pause(1000);

        // 3. Verify CurrentStack.md is empty
        const stackContent = await browser.execute(async () => {
            const file = app.vault.getAbstractFileByPath('todo-flow/CurrentStack.md');
            if (!file) return "NOT_FOUND";
            return await app.vault.read(file);
        });

        // The implementation might leave the header or be completely empty. 
        // Based on main.ts:311, it saves []. 
        // Persistence service for [] usually results in just the header or empty file.
        expect(stackContent).not.toContain('Task1');
    });

    it('AC-09: export-current-stack', async () => {
        // 1. Configure export folder
        await browser.execute(async () => {
            const plugin = (app as any).plugins.plugins['todo-flow'];
            plugin.settings.exportFolder = 'todo-flow/Exports';
            await plugin.saveSettings();

            const adapter = app.vault.adapter;
            if (!(await adapter.exists('todo-flow/Exports'))) {
                await adapter.mkdir('todo-flow/Exports');
            }
        });

        // 2. Trigger Export
        await browser.execute('app.commands.executeCommandById("todo-flow:export-current-stack")');
        await browser.pause(2000);

        // 3. Verify file exists in Exports folder
        const exportFiles = await browser.execute(async () => {
            const adapter = app.vault.adapter;
            const listing = await adapter.list('todo-flow/Exports');
            return listing.files;
        });

        expect(exportFiles.length).toBeGreaterThan(0);
        expect(exportFiles[0]).toContain('Export-');
    });

    it('AC-08: add-linked-docs-to-stack', async () => {
        // 1. Create a file with links
        await browser.execute(async () => {
            if (!(await app.vault.adapter.exists('SourceFile.md'))) {
                await app.vault.create('SourceFile.md', 'Check [[LinkedTask1]] and [[LinkedTask2]]');
            }
            if (!(await app.vault.adapter.exists('LinkedTask1.md'))) {
                await app.vault.create('LinkedTask1.md', '# Linked Task 1');
            }
        });

        // 2. Open the source file
        await browser.execute(async () => {
            const file = app.vault.getAbstractFileByPath('SourceFile.md');
            if (file) {
                await app.workspace.getLeaf(false).openFile(file);
            }
        });
        await browser.pause(1000);

        // 3. Trigger command
        await browser.execute('app.commands.executeCommandById("todo-flow:add-linked-docs-to-stack")');
        await browser.pause(2000);

        // 4. Verify Stack contains LinkedTask1
        const stackContent = await browser.execute(async () => {
            const file = app.vault.getAbstractFileByPath('todo-flow/CurrentStack.md');
            if (!file) return null;
            return await app.vault.read(file);
        });

        expect(stackContent).toContain('LinkedTask1');
    });
});
