import { expect, browser, $$, $ } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Link Injection in Child Stacks', () => {
    const VAULT_PATH = path.resolve(process.cwd(), '.test-vault');
    const TARGET_FOLDER = 'todo-flow';

    async function prePopulateVault() {
        const folderPath = path.join(VAULT_PATH, TARGET_FOLDER);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        // Create Parent.md in the root
        fs.writeFileSync(path.join(VAULT_PATH, `ParentTask.md`), `---\nflow_state: shortlist\n---\n# Parent Task\n\n- [ ] [[Child1]]`);
        // Create Child1.md
        fs.writeFileSync(path.join(VAULT_PATH, `Child1.md`), `---\nflow_state: shortlist\n---\n# Child 1`);
    }

    beforeEach(async () => {
        await prePopulateVault();
        await browser.pause(2000);

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
        await browser.pause(2000);
    });

    it('RED: Should inject a link in ParentTask.md when a new task is added inside its stack', async () => {
        try {
            // 1. Programmatically navigate into ParentTask.md
            await browser.execute(() => {
                // @ts-ignore
                const view = app.workspace.getLeavesOfType("todo-flow-stack-view")[0].view;
                view.setState({ rootPath: "ParentTask.md" }, {});
            });
            await browser.pause(3000);

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
