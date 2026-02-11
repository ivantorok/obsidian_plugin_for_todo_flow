import { browser, expect, $ } from '@wdio/globals';
import { cleanupVault } from '../test_utils.js';

describe('Dump Mechanism (The Big Bang)', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });

        // Ensure clean state
        await cleanupVault();

        // Configure Plugin & Ensure Folder
        await browser.execute(async () => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            if (plugin) {
                plugin.settings.targetFolder = 'todo-flow';
                plugin.settings.debug = true;
                await plugin.saveSettings();
            }
            // @ts-ignore
            const adapter = app.vault.adapter;
            // @ts-ignore
            if (!(await adapter.exists('todo-flow'))) {
                // @ts-ignore
                await adapter.mkdir('todo-flow');
            }
        });
    });

    after(async function () {
        await cleanupVault();
    });

    it('should reliably create files from a multi-line dump', async () => {
        // 1. Open Dump View
        await browser.execute(() => {
            // @ts-ignore
            app.commands.executeCommandById('todo-flow:open-todo-dump');
        });

        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getLeavesOfType('todo-flow-dump-view').length > 0;
            });
        }, { timeout: 5000 });

        const dumpInput = await $('textarea.todo-flow-dump-input');
        await expect(dumpInput).toBeDisplayed();

        // 2. Enter 3 tasks (One by one, as Dump View expects independent thoughts)
        const tasks = ['Big Bang Task 1', 'Big Bang Task 2', 'Big Bang Task 3'];
        for (const task of tasks) {
            await dumpInput.setValue(task);
            await browser.keys(['Enter']);
            // Small pause to ensure processing (though not strictly necessary if serial)
            await browser.pause(100);
        }

        // 3. Submit Dump ("done")
        await dumpInput.setValue('done');
        await browser.keys(['Enter']);

        // 4. Wait for Triage (Signal that dump is processed)
        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getLeavesOfType('todo-flow-triage-view').length > 0;
            });
        }, { timeout: 10000 });

        // 5. Explicit Stabilization Wait (The "Big Bang" aspect)
        console.log('[Test] Waiting for filesystem stabilization...');
        await browser.pause(2000);

        const fileCheck = await browser.execute(async (expectedTasks) => {
            const results = [];
            // @ts-ignore
            const adapter = app.vault.adapter;

            if (!(await adapter.exists('todo-flow'))) return results;

            const files = (await adapter.list('todo-flow')).files;

            for (const taskName of expectedTasks) {
                let found = false;
                for (const file of files) {
                    const content = await adapter.read(file);
                    if (content.includes(`task: ${taskName}`) || content.includes(`# ${taskName}`)) {
                        found = true;
                        break;
                    }
                }
                results.push({ task: taskName, found });
            }
            return results;
        }, tasks);

        console.log('[Test] File Check Results:', JSON.stringify(fileCheck, null, 2));

        for (const res of fileCheck) {
            expect(res.found).toBe(true);
        }
    });
});
