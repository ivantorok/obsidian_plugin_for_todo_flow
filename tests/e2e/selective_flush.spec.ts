import { expect, browser, $ } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Hardened selective_flush spec (v42 — Sync Fortress).
 *
 * Tests that archiving a task + immediately reloading doesn't lose the archive.
 * Uses DOM-dispatched KeyboardEvent (not browser.keys) and waitUntil (not browser.pause).
 */
describe('Selective Flush Race Condition (Hardened)', () => {
    const VAULT_PATH = path.resolve(process.cwd(), '.test-vault');
    const TARGET_FOLDER = 'todo-flow';
    const STACK_FILE = path.join(VAULT_PATH, TARGET_FOLDER, 'CurrentStack.md');

    async function prePopulateVault() {
        const folderPath = path.join(VAULT_PATH, TARGET_FOLDER);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const tasks = ['Task1', 'Task2', 'Task3'];
        for (const t of tasks) {
            fs.writeFileSync(path.join(VAULT_PATH, `${t}.md`), `---\nflow_state: shortlist\n---\n# ${t}`);
        }

        const stackContent = `# Current Stack\n\n- [ ] [[Task1.md|Task1]]\n- [ ] [[Task2.md|Task2]]\n- [ ] [[Task3.md|Task3]]`;
        fs.writeFileSync(STACK_FILE, stackContent);
    }

    beforeEach(async function () {
        // 1. Reload Obsidian to get a clean state
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });

        // 2. Pre-populate vault files AFTER reload
        await prePopulateVault();

        // 3. Wait for Obsidian to detect and index the pre-populated files
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => {
                // @ts-ignore
                const files = app.vault.getMarkdownFiles().map((f: any) => f.path);
                return files.includes('Task1.md') && files.includes('Task2.md') && files.includes('Task3.md');
            });
        }, { timeout: 15000, timeoutMsg: 'Vault did not index Task1/2/3.md after pre-population' });

        // 4. Enable debug logging
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            if (plugin) {
                plugin.settings.debug = true;
                plugin.logger.setEnabled(true);
            }
        });

        // 5. Open the daily stack
        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');

        // 6. Wait for stack container to be UI-ready
        const container = await $('.todo-flow-stack-container[data-ui-ready="true"]');
        await container.waitForExist({ timeout: 15000, timeoutMsg: 'Stack container never became UI-ready' });

        // 7. Wait for 3 tasks to load
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => {
                // @ts-ignore
                const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
                return view && view.component && view.getTasks().length === 3;
            });
        }, { timeout: 15000, timeoutMsg: 'Stack did not load 3 tasks' });
    });

    it('GREEN: Should show 2 tasks if flushed correctly', async function () {
        this.timeout(180000);

        // Ensure UI is ready with 3 tasks via data attribute
        // @ts-ignore
        await browser.waitUntil(async () => {
            const container = await $('.todo-flow-stack-container');
            const count = await container.getAttribute('data-task-count');
            return count === '3';
        }, { timeout: 10000, timeoutMsg: 'Task count never reached 3' });

        // 1. Archive Task1 by dispatching a KeyboardEvent on the stack container DOM element.
        // This goes through the real StackView.onOpen keydown listener, avoiding both:
        //   - WDIO event propagation races (no browser.keys)
        //   - Synthetic event null-target crashes (no direct handleKeyDown call)
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            if (!view || !view.component) return;

            // Ensure focus is on the first task
            if (view.component.setFocus) view.component.setFocus(0);

            // Dispatch on the container element (which has the keydown listener from onOpen)
            const container = document.querySelector('.todo-flow-stack-container') as HTMLElement;
            if (container) {
                container.focus();
                const event = new KeyboardEvent('keydown', {
                    key: 'z', code: 'KeyZ', bubbles: true, cancelable: true
                });
                // Dispatch on window (matching StackView.onOpen's registerDomEvent(window, 'keydown', ...))
                window.dispatchEvent(event);
            }
        });

        // Wait for the task count to drop below 3
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => {
                // @ts-ignore
                const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
                if (!view) return false;
                return view.getTasks().length < 3;
            });
        }, { timeout: 10000, timeoutMsg: 'Task1 did not disappear from UI after Archive' });

        // 2. IMMEDIATELY reload while debounce is likely pending
        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');

        // 3. Wait for the reload to finish AND for the count to be correct (2)
        // @ts-ignore
        await browser.waitUntil(async () => {
            const container = await $('.todo-flow-stack-container[data-ui-ready="true"]');
            if (!(await container.isExisting())) return false;
            const count = await container.getAttribute('data-task-count');
            return count === '2';
        }, { timeout: 15000, timeoutMsg: 'Tasks did not settle to 2 after rapid reload' });

        // 4. Print in-memory logs for debugging
        const logs = await browser.execute(() => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            return plugin ? plugin.logger.getBuffer() : ['Plugin not found'];
        });
        console.log('--- IN-MEMORY PLUGIN LOGS ---');
        logs.forEach((l: string) => console.log(l));
        console.log('-----------------------------');

        // 5. VERIFY: Final check via view API
        // @ts-ignore
        const taskCount = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            return view ? view.getTasks().length : -1;
        });
        console.log(`[TEST] Task count after rapid reload: ${taskCount}`);
        expect(taskCount).toBe(2);
    });
});
