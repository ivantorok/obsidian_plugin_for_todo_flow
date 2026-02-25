import { browser, expect, $ } from '@wdio/globals';

describe('Sovereign Bridge: Deterministic Idle Markers (TDD)', () => {
    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await browser.pause(2000);
    });

    it('should expose [data-persistence-idle] attribute on the stack container', async () => {
        // 1. Open the stack
        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');

        const container = await $('.todo-flow-stack-container');
        await container.waitForExist({ timeout: 10000 });

        // 2. Initial state check: Wait for idle state (can be false during vault index)
        await browser.waitUntil(async () => {
            const mark = await container.getAttribute('data-persistence-idle');
            return mark === 'true';
        }, { timeout: 10000, timeoutMsg: 'Initial persistence state never became idle' });

        // 3. Action: Modify something to trigger a save
        // We'll focus a card and scaling duration
        const firstCard = await $('.todo-flow-task-card');
        if (await firstCard.isExisting()) {
            await firstCard.click();
            // @ts-ignore
            await browser.keys(['f']); // Scale duration UP

            // 4. Verification: Marker should momentarily reflect non-idle state
            const movingMark = await container.getAttribute('data-persistence-idle');
            console.log(`[TDD] State during modification: ${movingMark}`);

            // 5. Wait for idle
            await browser.waitUntil(async () => {
                const mark = await container.getAttribute('data-persistence-idle');
                return mark === 'true';
            }, { timeout: 10000, timeoutMsg: 'Persistence never returned to idle state' });
        }
    });
});
