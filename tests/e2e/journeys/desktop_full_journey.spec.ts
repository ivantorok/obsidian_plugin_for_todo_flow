import { browser, $, $$, expect } from '@wdio/globals';
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
        await browser.pause(500);

        // Wait for Task A (index 0) to have the focused class
        await browser.waitUntil(async () => {
            const allCards = await $$('.todo-flow-task-card');
            for (let i = 0; i < allCards.length; i++) {
                const cls = await allCards[i].getAttribute('class');
                const testId = await allCards[i].getAttribute('data-testid');
                console.log(`[Diagnostic] Card ${i}: testId=${testId}, class="${cls}"`);
                if (cls.includes('is-focused') && testId === 'task-card-0') return true;
            }
            return false;
        }, { timeout: 15000, timeoutMsg: 'Task A (index 0) was not focused after clicking' });

        await focusStack();

        // Ensure the container has focus for keyboard events
        const container = await $('.todo-flow-stack-container');

        // Initial focus 0 (Task A)
        console.log('[Journey] Step 2: Navigating down to Task B');

        await browser.execute((el) => {
            const element = el as HTMLElement;
            element.focus();
            console.log(`[Browser] Manually focused container. tag=${element.tagName}, class=${element.className}, isContentEditable=${element.isContentEditable}`);

            // Add global listener to confirm event arrival
            (window as any)._logs = (window as any)._logs || [];
            window.addEventListener('keydown', (e) => {
                (window as any)._logs.push(`[GLOBAL] KeyDown: ${e.key}, Target: ${(e.target as HTMLElement).tagName}`);
            });
        }, await container);
        await browser.pause(500);

        // Emit 'j' key via WDIO to navigate down
        // @ts-ignore
        await browser.keys(['j']);
        await browser.pause(500);

        // Wait for focus to sync using container attribute AND card class
        await browser.waitUntil(async () => {
            const container = await $('.todo-flow-stack-container');
            const focusedIndexAttr = await container.getAttribute('data-focused-index');
            const uiReady = await container.getAttribute('data-ui-ready');
            const viewMode = await container.getAttribute('data-view-mode');
            const focusedCards = await $$('.todo-flow-task-card.is-focused');

            // DIAGNOSTICS
            const activeTag = await browser.execute(() => document.activeElement?.tagName);
            const activeClass = await browser.execute(() => document.activeElement?.className);
            const activeEditable = await browser.execute(() => (document.activeElement as HTMLElement)?.isContentEditable);
            const lastAction = await browser.execute(() => (window as any)._lastAction);
            const logs = await browser.execute(() => {
                const l = (window as any)._logs || [];
                (window as any)._logs = [];
                return l;
            });
            if (logs.length > 0) console.log(`[Browser Logs] ${logs.join('\n')}`);

            const cardInfo = [];
            const allCards = await $$('.todo-flow-task-card');
            for (let i = 0; i < allCards.length; i++) {
                const cls = await allCards[i].getAttribute('class');
                const tId = await allCards[i].getAttribute('data-testid');
                cardInfo.push(`Card ${i}: testId=${tId}, class="${cls}"`);
            }

            console.log(`[Diagnostic] Container index: ${focusedIndexAttr}, UI Ready: ${uiReady}, View: ${viewMode}, Active: ${activeTag}.${activeClass}, Editable: ${activeEditable}, LastAction: ${lastAction}, Focused Cards: ${focusedCards.length}`);
            if (cardInfo.length > 0) console.log(`[Card States]\n${cardInfo.join('\n')}`);

            // Success condition: attribute is 1 AND correctly identified card has is-focused
            if (focusedIndexAttr === '1') {
                for (const card of focusedCards) {
                    if (await card.getAttribute('data-testid') === 'task-card-1') return true;
                }
            }
            return false;
        }, { timeout: 15000, timeoutMsg: 'Focus did not move to Task B after pressing j' });

        // Double check via view component diagnostic
        let focusIndex = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            return view?.component?.getFocusedIndex?.() ?? -1;
        });
        expect(focusIndex).toBe(1);

        // --- STEP 3: Keyboard Reorder (Shift+J) ---
        console.log('[Journey] Step 3: Moving Task B down');
        // @ts-ignore
        await browser.keys(['J']);
        await browser.pause(500);

        const logs = await browser.execute(() => (window as any)._logs || []);
        console.log('--- BROWSER LOGS ---');
        console.log(logs.join('\n'));
        console.log('--------------------');

        let titles = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view.getTasks().map(t => t.title);
        });
        expect(titles[2]).toBe('Task B');

        // Wait for UI Ready signal
        await (await $('.todo-flow-stack-container[data-ui-ready="true"]')).waitForExist({ timeout: 5000 });

        // Use the actual keybinding 'e' for renaming
        await browser.keys(['e']);
        await browser.pause(1000);

        const renameInput = await $('[data-testid="rename-input"]');
        await renameInput.waitForDisplayed({ timeout: 5000 });
        await browser.execute((el) => {
            const input = el as HTMLInputElement;
            input.value = 'Task B Edited';
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }, await renameInput);
        await browser.keys(['Enter']);
        await browser.pause(1000); // Allow Svelte and Obsidian to sync

        let renamedTitle = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view.getTasks()[2].title;
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

        // Ensure stack is focused (setActiveLeaf + container focus)
        await focusStack();

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

    after(async () => {
        const logs = await browser.execute(() => (window as any)._logs || []);
        console.log('--- BROWSER LOGS (AFTER) ---');
        console.log(logs.join('\n'));
        console.log('----------------------------');
    });
});
