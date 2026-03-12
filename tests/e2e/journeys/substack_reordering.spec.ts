import { test, expect } from '@wdio/globals';
import * as path from 'path';
import * as fs from 'fs';

describe('FEAT-018: Substack Reordering', () => {
    let parentFilePath: string;

    before(async () => {
        // Prepare the fixture files
        const fixturesDir = path.join(process.cwd(), '.test-vault', 'FEAT-018');
        parentFilePath = path.join(fixturesDir, 'reorder_parent.md');
        
        if (!fs.existsSync(fixturesDir)) {
            fs.mkdirSync(fixturesDir, { recursive: true });
        }
        
        fs.writeFileSync(parentFilePath, `# Parent
- [ ] [[reorder_child_1|Child 1]]
- [ ] [[reorder_child_2|Child 2]]
- [ ] [[reorder_child_3|Child 3]]`);

        fs.writeFileSync(path.join(fixturesDir, 'reorder_child_1.md'), '---\nduration: 10\n---\n# Child 1');
        fs.writeFileSync(path.join(fixturesDir, 'reorder_child_2.md'), '---\nduration: 20\n---\n# Child 2');
        fs.writeFileSync(path.join(fixturesDir, 'reorder_child_3.md'), '---\nduration: 30\n---\n# Child 3');

        // Reload obsidian to force metadataCache to see the newly written files
        await (browser as any).reloadObsidian({ vault: './.test-vault' });

        // Open the stack view first to ensure it exists
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');
        
        // Wait for stack container to be UI-ready
        const container = await $('.todo-flow-stack-container[data-ui-ready="true"]');
        await container.waitForExist({ timeout: 15000, timeoutMsg: 'Stack container never became UI-ready' });

        // Verify via Obsidian API first
        const { obsidianContent, obsidianVaultPath } = await browser.execute(async (path) => {
            try {
                return {
                    obsidianContent: await (window as any).app.vault.adapter.read(path),
                    obsidianVaultPath: (window as any).app.vault.adapter.basePath
                };
            } catch (e) {
                return { obsidianContent: `ERROR: ${e}`, obsidianVaultPath: 'ERROR' };
            }
        }, 'FEAT-018/reorder_parent.md');
        console.log("OBSIDIAN VAULT PATH:", obsidianVaultPath);
        console.log("OBSIDIAN CONTENT READBACK:", obsidianContent);
        // Load the parent file directly into the StackView
        await browser.execute((fileId) => {
            const plugin = (window as any).app.plugins.plugins['todo-flow'];
            plugin.activateStack(fileId);
        }, 'FEAT-018/reorder_parent.md');
        // Wait for view to initialize
        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                const leaf = (window as any).app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
                return !!(leaf && leaf.view && leaf.view.component && leaf.view.getTasks().length > 0);
            });
        }, { timeout: 15000, timeoutMsg: 'Stack view component never became ready with tasks' });
    });

    it('should visually present the children in their initial order', async () => {
        try {
            await browser.waitUntil(async () => {
                const tasks = await $$('.todo-flow-task-card .title');
                return tasks.length === 3;
            }, { timeout: 10000, timeoutMsg: 'Did not find 3 child tasks to load' });
        } catch (e) {
            console.error("/// CHILDREN DID NOT LOAD ///");
            const text = await browser.execute(() => document.querySelector('.todo-flow-stack-container')?.textContent || "NO CONTAINER");
            console.error("CONTAINER TEXT:");
            console.error(text);
            throw e;
        }

        const tasks = await $$('.todo-flow-task-card .title');
        expect(await tasks[0].getText()).toBe('Child 1');
        expect(await tasks[1].getText()).toBe('Child 2');
        expect(await tasks[2].getText()).toBe('Child 3');
    });

    it('should physically persist order to the markdown file when reordered via UI', async () => {
        // We will mock the StackController's manual reordering since WDIO drag-and-drop 
        // on Svelte touch/sortable.js is notoriously flaky in JSDOM/WebDriver.
        
        // the view handles setting StackContext. Wait for Svelte reactivity
        await browser.waitUntil(
            async () => {
                const els = await $$('.todo-flow-stack-container[data-ui-ready="true"]');
                return els.length > 0;
            },
            { timeout: 5000, timeoutMsg: 'UI did not become ready after navigation' }
        );
        await browser.execute(async () => {
            const leaves = (window as any).app.workspace.getLeavesOfType('todo-flow-stack-view');
            if (leaves.length > 0) {
                const view = leaves[0].view;
                const controller = view.getController();
                controller.moveTaskToIndex(2, 0);
                const tasks = controller.getTasks();
                view.tasks = [...tasks];
                view.navManager.setState({ ...view.navManager.getState(), currentStack: tasks, currentFocusedIndex: 0 });
                await view.syncManager.handleStackChange(tasks, true);
                view.pushStateToComponent(0);
            }
        });

        // Visually verify the UI updated
        await browser.waitUntil(async () => {
            const tasks = await $$('.todo-flow-task-card .title');
            if (tasks.length < 3) return false;
            const t1 = await tasks[0].getText();
            return t1.includes('Child 3');
        }, { timeout: 10000, timeoutMsg: 'UI did not reorder Task 3 to top' });

        // Wait for persistence to finish
        const stackContainer = await $('.todo-flow-stack-container');
        await browser.waitUntil(
            async () => await stackContainer.getAttribute('data-persistence-idle') === 'true',
            { timeout: 10000, timeoutMsg: 'Persistence did not flush (interaction-idle)' }
        );

        // Give the file system a moment to settle
        await browser.pause(1000);

        // Verify via Obsidian API first
        const { obsidianContent, obsidianVaultPath } = await browser.execute(async (path) => {
            try {
                return {
                    obsidianContent: await (window as any).app.vault.adapter.read(path),
                    obsidianVaultPath: (window as any).app.vault.adapter.basePath
                };
            } catch (e) {
                return { obsidianContent: `ERROR: ${e}`, obsidianVaultPath: 'ERROR' };
            }
        }, 'FEAT-018/reorder_parent.md');
        
        // Resolve the ACTUAL physical path on the host
        const actualPhysicalPath = path.join(obsidianVaultPath, 'FEAT-018/reorder_parent.md');

        // Verify the file on disk was definitively mutated
        await browser.waitUntil(() => {
            const diskContent = fs.readFileSync(actualPhysicalPath, 'utf8');
            return diskContent.includes('[[reorder_child_3|Child 3]]');
        }, { timeout: 10000, timeoutMsg: 'File on disk never updated with reordered tasks' });

        const finalContent = fs.readFileSync(actualPhysicalPath, 'utf8');
        expect(finalContent).toContain('- [ ] [[reorder_child_3|Child 3]]\n- [ ] [[reorder_child_1|Child 1]]\n- [ ] [[reorder_child_2|Child 2]]');
    });
});
