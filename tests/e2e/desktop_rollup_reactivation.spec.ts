import { browser, $, expect } from '@wdio/globals';
import { focusStack } from './e2e_utils.js';

describe('BUG-00X: Rollup Reactivation', () => {

    before(async () => {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });

        // Ensure Plugin Settings are configured
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

    it('should maintain child duration when parent is marked done and then undone', async () => {
        // --- 1. CLEANUP & OPEN DUMP ---
        console.log('[Test] Cleaning up vault...');
        await browser.execute(async () => {
            // @ts-ignore
            const files = app.vault.getMarkdownFiles();
            for (const f of files) await app.vault.delete(f);
            // @ts-ignore
            const folder = app.vault.getAbstractFileByPath('todo-flow');
            if (folder) await app.vault.delete(folder, true);
        });

        console.log('[Test] Opening Dump View...');
        await browser.execute(() => {
            // @ts-ignore
            app.commands.executeCommandById('todo-flow:open-todo-dump');
        });

        const dumpInput = await $('textarea.todo-flow-dump-input');
        await dumpInput.waitForExist({ timeout: 10000 });

        // --- 2. CREATE PARENT ---
        console.log('[Test] Entering Parent...');
        await dumpInput.setValue('Parent');
        await browser.keys(['Enter']);
        await browser.pause(500);

        console.log('[Test] Submitting Dump...');
        await dumpInput.setValue('done');
        await browser.keys(['Enter']);

        // --- 3. TRIAGE ---
        console.log('[Test] Waiting for Triage View...');
        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getLeavesOfType('todo-flow-triage-view').length > 0;
            });
        }, { timeout: 10000, timeoutMsg: 'Triage View did not appear' });

        // Focus Triage
        await browser.execute(() => {
            // @ts-ignore
            const leaf = app.workspace.getLeavesOfType('todo-flow-triage-view')[0];
            if (leaf) app.workspace.setActiveLeaf(leaf, { focus: true });
        });
        await browser.pause(500);

        // Shortlist 'Parent'
        console.log('[Test] Shortlisting Parent (k)...');
        await browser.keys(['k']);
        await browser.pause(1000);

        // --- 4. STACK ---
        console.log('[Test] Waiting for Stack View...');
        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                // @ts-ignore
                const stackLeaves = app.workspace.getLeavesOfType('todo-flow-stack-view');
                return stackLeaves.length > 0;
            });
        }, { timeout: 10000, timeoutMsg: 'Stack View did not appear after Triage' });

        await focusStack();
        const parentCard = await $('[data-testid="task-card-0"]');
        await parentCard.waitForExist({ timeout: 10000 });

        // --- 5. DRILL DOWN & CREATE CHILD ---
        console.log('[Test] Drilling down into Parent...');
        await parentCard.click();
        await browser.keys(['Enter']);
        // Wait for sub-stack to be empty
        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                // @ts-ignore
                const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
                // @ts-ignore
                return view && view.getTasks().length === 0;
            });
        }, { timeout: 5000, timeoutMsg: 'Sub-stack did not appear empty' });

        console.log('[Test] Creating Child...');
        await browser.keys(['c']);
        const quickAddInput = await $('.prompt-input');
        await quickAddInput.waitForDisplayed({ timeout: 5000 });
        await quickAddInput.setValue('Child');
        await browser.keys(['Shift', 'Enter']);
        await browser.pause(1000);

        const childCard = await $('[data-testid="task-card-0"]');
        await childCard.waitForExist({ timeout: 5000 });

        console.log('[Test] Increasing Child duration...');
        await browser.keys(['f']); // +15m
        await browser.pause(200);
        await browser.keys(['f']); // +15m (Total 30m added?)
        await browser.pause(1000);

        // --- 6. GO BACK & VERIFY ROLLUP ---
        console.log('[Test] Navigating back...');
        await browser.keys(['h']);

        // RE-QUERY the parent card because Svelte destroys/recreates the DOM here!
        const parentCardBack = await $('[data-testid="task-card-0"]');
        await parentCardBack.waitForExist({ timeout: 5000 });
        const durationEl = await parentCardBack.$('.duration-text');

        // Wait for the duration string to update to something other than the default 30m
        for (let i = 0; i < 8; i++) {
            const tempText = await durationEl.getText();
            console.log(`[Test Debug] Parent Duration tick ${i}: "${tempText}"`);
            if (tempText === '1h 30m') break;
            await browser.pause(1000);
        }

        // Dump internal plugin logs to understand GraphBuilder behavior
        const internalLogs = await browser.execute(() => (window as any)._logs || []);
        console.log('[Test] === Internal Plugin Logs ===');
        for (const log of internalLogs) {
            console.log(`[Plugin] ${log}`);
        }
        console.log('[Test] === End Internal Logs ===');

        const initialDurationText = await durationEl.getText(); // Should be 1h 0m or 1h 30m depending on strategy
        console.log(`[Test] Initial Parent Duration (Rolled up): ${initialDurationText}`);

        console.log('[Test] Marking Parent DONE...');
        await browser.keys(['x']);
        await browser.pause(1000);

        const doneDurationText = await durationEl.getText();
        console.log(`[Test] Done Parent Duration: ${doneDurationText}`);
        expect(doneDurationText).toBe(initialDurationText);

        console.log('[Test] Marking Parent UNDONE...');
        await browser.keys(['x']);
        await browser.pause(1000);

        const finalDurationText = await durationEl.getText();
        expect(finalDurationText).toBe(initialDurationText);
        console.log('[Test] Rollup persistence verified.');
    });
});
