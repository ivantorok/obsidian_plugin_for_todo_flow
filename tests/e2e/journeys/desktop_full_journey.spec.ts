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

        // Wait for UI Ready signal
        await $('.todo-flow-stack-container[data-ui-ready="true"]').waitForExist({ timeout: 5000 });

        // Wait for tasks to be projected (3 tasks expected)
        await $('.todo-flow-stack-container[data-task-count="3"]').waitForExist({ timeout: 10000 });

        // Wait for cards to appear and click first task to ensure focus
        const card0 = await $('[data-testid="task-card-0"]');
        await card0.waitForExist({ timeout: 10000 });
        await card0.click();

        await focusStack();

        // --- STEP 2: Keyboard Navigation (j/k) ---
        console.log('[Journey] Step 2: Navigating with j/k');
        // Initial focus 0 (Task A)
        // @ts-ignore
        await browser.keys(['j']); // Task B (1)

        // Wait for focus to sync to 1 using the new diagnostic attribute
        await browser.waitUntil(async () => {
            const idx = await browser.execute(() => {
                const el = document.querySelector('.todo-flow-stack-container');
                return el ? parseInt(el.getAttribute('data-focused-index') || '0') : -1;
            });
            return idx === 1;
        }, { timeout: 3000, timeoutMsg: 'Focus did not move to 1 after pressing j' });

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

        // Wait for UI Ready signal
        await (await $('.todo-flow-stack-container[data-ui-ready="true"]')).waitForExist({ timeout: 5000 });

        // Use programmatic trigger now that it is explicitly $exposed
        await browser.execute(() => {
            // @ts-ignore
            const leaf = app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
            if (leaf && leaf.view.component) {
                leaf.view.component.startRename(0);
            }
        });
        await browser.pause(1000);

        const renameInput = await $('[data-testid="rename-input"]');
        await renameInput.waitForDisplayed({ timeout: 5000 });
        await renameInput.setValue('Task B Edited');
        await browser.keys(['Enter']);
        await browser.pause(1000); // Allow Svelte and Obsidian to sync

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
