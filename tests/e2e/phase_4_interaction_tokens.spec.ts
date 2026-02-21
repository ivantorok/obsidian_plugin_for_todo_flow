import { browser, expect, $ } from '@wdio/globals';
import { setupStackWithTasks, focusStack } from './e2e_utils.js';

describe('Phase 4: Skeptical Specs - Interaction Token Sovereignty', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        // Create real file-backed tasks via Dump → Triage → Stack flow
        await setupStackWithTasks(['Lock Task A']);
        await focusStack();
    });

    it('should reject external updates while a touch/interaction is active on a specifically locked path', async () => {
        // 1. Wait for the stack view to be ready
        const container = await $('.todo-flow-stack-container');
        await browser.waitUntil(async () => {
            const ready = await container.getAttribute('data-ui-ready');
            return ready === 'true';
        }, { timeout: 10000, timeoutMsg: 'Stack container not ready' });

        const card = await $('.todo-flow-task-card');
        await card.waitForExist({ timeout: 5000 });

        // 2. Start an interaction (Simulate hold to lock the persistence path)
        await browser.pause(500); // Give UI time to stabilize
        await card.moveTo();
        await browser.performActions([{
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: 0, y: 0, origin: card },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 500 }
            ]
        }]);

        // 3. Verify the card exists during interaction (the task card is always present with class is-focused in FocusStack)
        const taskCard = await $('.todo-flow-task-card');
        expect(await taskCard.isExisting()).toBe(true);

        // 4. Simulate an external update from Obsidian Sync while interacting
        await browser.execute(async () => {
            const persistencePath = 'todo-flow/CurrentStack.md';
            // @ts-ignore
            await app.vault.adapter.process(persistencePath, (content) => {
                return content + '\n- [ ] [[ExternalTrigger]]';
            });
        });

        // 5. End interaction
        await browser.performActions([{
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [{ type: 'pointerUp', button: 0 }]
        }]);

        // 6. Verification: The UI should NOT have reloaded during/immediately after the interaction
        // because the "Interaction Token" should have SILENCED the watcher for that specific path.
        // Give the watcher a brief moment to fire if it were going to
        await browser.pause(500);
        const externalTask = await $('*=ExternalTrigger');
        expect(await externalTask.isExisting()).toBe(false);
    });
});
