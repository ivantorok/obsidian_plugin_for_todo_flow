import { expect, browser, $$, $ } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Selective Flush Race Condition', () => {
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

    it('GREEN: Should show 2 tasks if flushed correctly', async () => {
        // Ensure UI is ready initially
        await $('.todo-flow-stack-container[data-ui-ready="true"][data-task-count="3"]').waitForExist({ timeout: 10000 });

        // Focus container for keyboard
        await browser.execute(() => {
            const container = document.querySelector('.todo-flow-stack-container') as HTMLElement;
            if (container) container.focus();
        });
        await browser.pause(500);

        // 1. Archive Task1 (Starts 500ms debounce)
        await browser.keys(['z']);

        // Wait for UI to show 2 tasks OR for the debounce to at least be in flight
        await browser.pause(200);

        // 2. IMMEDIATELY reload while debounce is likely pending
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');

        // 3. Wait for the reload to finish AND for the count to be correct (2)
        // We look for data-task-count="2" on the ready container
        const container = await $('.todo-flow-stack-container[data-ui-ready="true"][data-task-count="2"]');
        await container.waitForExist({ timeout: 10000, timeoutMsg: 'Tasks did not settle to 2 after rapid reload' });

        // 4. Print in-memory logs for debugging
        const logs = await browser.execute(() => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            return plugin ? plugin.logger.getBuffer() : ['Plugin not found'];
        });
        console.log('--- IN-MEMORY PLUGIN LOGS ---');
        logs.forEach((l: string) => console.log(l));
        console.log('-----------------------------');

        // 5. VERIFY: Final check
        const cards = await $$('.todo-flow-task-card');
        console.log(`[TEST] Task count after rapid reload: ${cards.length}`);
        expect(cards.length).toBe(2);
    });
});
