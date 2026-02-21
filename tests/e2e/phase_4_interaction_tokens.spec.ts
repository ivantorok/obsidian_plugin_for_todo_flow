import { browser, expect, $, $$ } from '@wdio/globals';

describe('Phase 4: Skeptical Specs - Interaction Token Sovereignty', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });

        // Ensure a task exists
        await browser.execute((content) => {
            // @ts-ignore
            app.vault.adapter.write('todo-flow/CurrentStack.md', content);
        }, '- [ ] [[Root Task]]\n  - [ ] [[Child task]]');
        await browser.execute('app.commands.executeCommandById("todo-flow:reload-stack")');
        await browser.pause(2000);
    });

    it('should reject external updates while a touch/interaction is active on a specifically locked path', async () => {
        // 1. Open the stack
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');
        const card = await $('.todo-flow-task-card');
        await card.waitForExist();

        // 2. Start an interaction (Simulate hold to lock)
        await browser.pause(500); // Give UI time to stabilize
        await card.waitForExist();
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

        // Verify focus state exists during interaction
        expect(await $('.todo-flow-task-card.is-focused').isExisting()).toBe(true);

        // 3. Simulate an external update from Obsidian Sync while interacting
        await browser.execute(async () => {
            const persistencePath = 'todo-flow/CurrentStack.md';
            // @ts-ignore
            await app.vault.adapter.process(persistencePath, (content) => {
                return content + '\n- [ ] [[ExternalTrigger]]';
            });
        });

        // 4. End interaction
        await browser.performActions([{
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [{ type: 'pointerUp', button: 0 }]
        }]);

        // 5. Verification: The UI should NOT have reloaded during/immediately after the interaction
        // because the "Interaction Token" should have SILENCED the watcher for that specific path.
        const externalTask = await $('*=ExternalTrigger');
        expect(await externalTask.isExisting()).toBe(false);
    });
});
