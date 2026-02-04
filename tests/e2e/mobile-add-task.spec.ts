import { browser, expect, $ } from '@wdio/globals';
import { emulateMobile } from './mobile_utils.js';

describe('Mobile: Atomic Add Task via Command Palette', () => {

    beforeEach(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await emulateMobile();

        // Ensure Plugin is Configured Correctly
        await browser.execute(async () => {
            // @ts-ignore
            const palette = app.internalPlugins?.getPluginById('command-palette');
            if (palette && !palette.enabled) await palette.enable();

            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            if (plugin) {
                plugin.settings.targetFolder = 'todo-flow';
                await plugin.saveSettings();
            }

            // @ts-ignore
            if (!(await app.vault.adapter.exists('todo-flow'))) {
                // @ts-ignore
                await app.vault.createFolder('todo-flow');
            }
        });
    });

    it('should create a new task via command palette without race conditions', async () => {
        // 1. Open Stack View
        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => app.workspace.getLeavesOfType('todo-flow-stack-view').length > 0);
        }, { timeout: 10000 });

        // 2. Open Command Palette
        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("command-palette:open")');

        // 3. Search and Select "Add Task to Stack"
        const paletteInput = await $('.command-palette-input input, .prompt-input');
        await paletteInput.waitForDisplayed({ timeout: 10000 });
        await paletteInput.setValue('Add Task to Stack');
        await browser.pause(500);
        // @ts-ignore
        await browser.keys(['Enter']);

        // 4. Input Task Title
        const promptInput = await $('.prompt-input');
        await promptInput.waitForDisplayed({ timeout: 10000 });
        const testTaskName = `Mobile Atomic ${Date.now()}`;
        await promptInput.setValue(testTaskName);
        await browser.pause(500);
        // @ts-ignore
        await browser.keys(['Enter']);

        // 5. Give room for async creation and UI update
        await browser.pause(3000);

        // 6. Verification: Task appears in the Stack View and get its ID
        // @ts-ignore
        const taskInfo = await browser.execute((name) => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            // @ts-ignore
            const tasks = view ? view.getTasks() : [];
            // @ts-ignore
            const task = tasks.find(t => t.title === name);
            return task ? { id: task.id, title: task.title } : null;
        }, testTaskName);

        expect(taskInfo).not.toBeNull();

        // 7. Verification: File Exists (The Android Fix check)
        // @ts-ignore
        const fileExists = await browser.execute((path) => {
            // @ts-ignore
            return app.vault.adapter.exists(path);
        }, taskInfo.id);
        expect(fileExists).toBe(true);
    });
});
