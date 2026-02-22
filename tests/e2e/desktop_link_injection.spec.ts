import { expect, browser, $$, $ } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Link Injection in Child Stacks', () => {
    const VAULT_PATH = path.resolve(process.cwd(), '.test-vault');
    const TARGET_FOLDER = 'todo-flow';

    async function prePopulateVault() {
        await browser.execute(async () => {
            // @ts-ignore
            const vault = app.vault;

            // Clean up to ensure fresh index
            for (const f of ['ParentTask.md', 'Child1.md']) {
                const existing = vault.getAbstractFileByPath(f);
                if (existing) await vault.delete(existing);
            }

            if (!vault.getAbstractFileByPath('todo-flow')) {
                await vault.createFolder('todo-flow');
            }

            await vault.create('ParentTask.md', '---\nflow_state: shortlist\n---\n# Parent Task\n\n- [ ] [[Child1]]');
            await vault.create('Child1.md', '---\nflow_state: shortlist\n---\n# Child 1');
        });
    }

    beforeEach(async () => {
        await prePopulateVault();

        // Wait for Obsidian to index the files
        await browser.waitUntil(async () => {
            return await browser.execute(() => !!app.vault.getAbstractFileByPath("ParentTask.md"));
        }, { timeout: 15000, msg: 'ParentTask.md never appeared in vault' });

        // Enable debug logging
        await browser.execute(() => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            if (plugin) {
                plugin.settings.debug = true;
                plugin.logger.setEnabled(true);
            }
        });

        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');

        // Wait for view to be ready
        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getLeavesOfType("todo-flow-stack-view").length > 0;
            });
        }, { timeout: 10000, msg: 'Stack view never opened' });
    });

    it('RED: Should inject a link in ParentTask.md when a new task is added inside its stack', async () => {
        try {
            // 1. Programmatically navigate into ParentTask.md
            await browser.execute(() => {
                // @ts-ignore
                const leaves = app.workspace.getLeavesOfType("todo-flow-stack-view");
                if (leaves.length > 0) {
                    leaves[0].view.setState({ rootPath: "ParentTask.md" }, {});
                }
            });

            await browser.waitUntil(async () => {
                return await browser.execute(() => {
                    // @ts-ignore
                    const leaves = app.workspace.getLeavesOfType("todo-flow-stack-view");
                    if (leaves.length === 0) return false;
                    const view = leaves[0].view;
                    // Probe class properties directly for reliability
                    return view.rootPath === "ParentTask.md" && view.tasks && view.tasks.length > 0;
                });
            }, { timeout: 15000, msg: 'Navigation to ParentTask.md failed or tasks not loaded' });

            // 2. Add a new task "NewSubTask"
            await browser.execute('app.commands.executeCommandById("todo-flow:add-task-to-stack")');
            await browser.pause(1000);

            const input = await $('.prompt-input');
            await input.setValue('NewSubTask');
            await browser.keys(['Shift', 'Enter']);
            await browser.pause(3000);

            // 3. VERIFY: via app.vault.adapter API for direct disk access
            const verificationResult = await browser.execute(async () => {
                // @ts-ignore
                const adapter = app.vault.adapter;
                // @ts-ignore
                const parentPath = 'ParentTask.md';
                // @ts-ignore
                const targetFolder = app.vault.getAbstractFileByPath('todo-flow');

                let parentContent = "";
                if (await adapter.exists(parentPath)) {
                    parentContent = await adapter.read(parentPath);
                }

                let childFound = false;
                let childFilename = "";
                // @ts-ignore
                if (targetFolder && targetFolder.children) {
                    // @ts-ignore
                    const children = targetFolder.children;
                    // @ts-ignore
                    const match = children.find(c => c.name.includes("NewSubTask"));
                    if (match) {
                        childFound = true;
                        childFilename = match.name;
                    }
                }

                return {
                    parentContent,
                    parentLength: parentContent.length,
                    childFound,
                    childFilename
                };
            });

            console.log(`[TEST DEBUG USER] Verification Result:`, verificationResult);

            expect(verificationResult.childFound).toBe(true);

            if (verificationResult.childFilename) {
                const expectedLink = `[[${TARGET_FOLDER}/${verificationResult.childFilename}|NewSubTask]]`;
                expect(verificationResult.parentContent).toContain(expectedLink);
            }
            expect(verificationResult.parentContent).toContain('Added on:');

        } finally {
            // Retrieve and print logs and errors
            const logs = await browser.execute(() => {
                // @ts-ignore
                const plugin = app.plugins.plugins['todo-flow'];
                return plugin ? plugin.logger.getBuffer() : ['Plugin not found'];
            });
            console.log('--- IN-MEMORY PLUGIN LOGS ---');
            logs.forEach((l: string) => console.log(l));
            console.log('-----------------------------');
        }
    });
});
