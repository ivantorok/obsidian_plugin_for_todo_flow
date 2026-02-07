import { browser, expect, $ } from '@wdio/globals';
import { setupStackWithTasks, focusStack } from '../e2e_utils.js';
import { cleanupVault } from '../test_utils.js';

describe('Desktop Full Journey: Keyboard Efficiency', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });

        // Configure Plugin
        await browser.execute(async () => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            if (plugin) {
                plugin.settings.targetFolder = 'todo-flow';
                plugin.settings.debug = true;
                await plugin.saveSettings();
            }
        });
    });

    after(async function () {
        await cleanupVault();
    });

    it('should complete a full keyboard-driven lifecycle on desktop', async () => {
        // --- STEP 1: Setup tasks via Dump Flow ---
        console.log('[Journey] Step 1: Creating Task A, B, C');
        await setupStackWithTasks(['Task A', 'Task B', 'Task C']);
        await focusStack();

        // --- STEP 2: Keyboard Navigation (j/k) ---
        console.log('[Journey] Step 2: Navigating with j/k');
        // Initial focus 0 (Task A)
        // @ts-ignore
        await browser.keys(['j']); // Task B (1)
        // @ts-ignore
        await browser.pause(300);

        let focusIndex = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view.component.getFocusedIndex();
        });
        expect(focusIndex).toBe(1);

        // --- STEP 3: Keyboard Reorder (Shift+K) ---
        console.log('[Journey] Step 3: Moving Task B to top');
        // @ts-ignore
        await browser.keys(['K']);
        await browser.pause(500);

        let titles = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view.getTasks().map(t => t.title);
        });
        expect(titles[0]).toBe('Task B');

        // --- STEP 4: Rename Task B ---
        console.log('[Journey] Step 4: Renaming Task B');
        // @ts-ignore
        await browser.keys(['e']);
        await browser.pause(1000);

        const input = await $('.todo-flow-title-input');
        await input.waitForDisplayed({ timeout: 5000 });
        // @ts-ignore
        await browser.keys(['ArrowRight', ' ', 'E', 'd', 'i', 't', 'e', 'd', 'Enter']);
        await browser.pause(500);

        let renamedTitle = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view.getTasks()[0].title;
        });
        expect(renamedTitle).toBe('Task B Edited');

        // --- STEP 5: Drill Down (Enter) ---
        console.log('[Journey] Step 5: Drilling down');
        // @ts-ignore
        await browser.keys(['Enter']);
        await browser.pause(1000);

        let taskCount = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view.getTasks().length;
        });
        // New file stack should be empty
        expect(taskCount).toBe(0);

        // --- STEP 6: Go Back (h) ---
        console.log('[Journey] Step 6: Navigating back');
        // @ts-ignore
        await browser.keys(['h']);
        await browser.pause(1000);

        taskCount = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view.getTasks().length;
        });
        expect(taskCount).toBe(3);

        // --- STEP 7: Archive (z) ---
        console.log('[Journey] Step 7: Archiving the task');
        // Task B is at index 0 and still focused
        // @ts-ignore
        await browser.keys(['z']);
        await browser.pause(1000);

        taskCount = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view.getTasks().length;
        });
        expect(taskCount).toBe(2);

        console.log('[Journey] ✅ Desktop Full Journey completed successfully');
    });
});
