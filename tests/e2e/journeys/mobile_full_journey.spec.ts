import { browser, expect, $, $$ } from '@wdio/globals';
import { emulateMobile } from '../mobile_utils.js';
import { setupStackWithTasks, focusStack } from '../e2e_utils.js';
import { cleanupVault } from '../test_utils.js';

describe('Mobile Full Journey: The Day of a User', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await emulateMobile();

        // Configure Plugin
        await browser.execute(async () => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            if (plugin) {
                plugin.settings.targetFolder = 'todo-flow';
                plugin.settings.debug = true;
                await plugin.saveSettings();
            }
            // @ts-ignore
            const palette = app.internalPlugins?.getPluginById('command-palette');
            if (palette && !palette.enabled) await palette.enable();
        });
    });

    after(async function () {
        await cleanupVault();
    });

    it('should complete a single-task lifecycle on mobile', async () => {
        // --- STEP 1: Add Task A via Dump Flow ---
        console.log('[Journey] Step 1: Adding Task A via Dump');
        await setupStackWithTasks(['Task A']);
        await focusStack();

        const taskACard = await $('[data-testid="lean-task-card"]');
        await taskACard.waitForDisplayed({ timeout: 10000 });

        const taskTitle = await $('[data-testid="lean-task-title"]');
        expect(await taskTitle.getText()).toBe('Task A');

        // --- STEP 2: Verify Duration (30m default) ---
        console.log('[Journey] Step 2: Verifying Duration');
        const durationText = await taskACard.$('.duration');
        expect(await durationText.getText()).toBe('30m');

        // Note: Lean Mobile doesn't have +/- buttons on the card yet, 
        // as Elias 1.1 focuses on "Momentum" and "Single Task Focus".
        // Scaling is deferred to Triage or Desktop for now per specification.

        // --- STEP 3: Archive Task A ---
        console.log('[Journey] Step 3: Archiving Task A');
        const archiveBtn = await $('[data-testid="lean-archive-btn"]');
        if (!(await archiveBtn.isDisplayed())) {
            await browser.saveScreenshot('./tests/e2e/failures/mobile_journey_debug.png');
            console.log('[Journey] DEBUG: Screenshot saved to ./tests/e2e/failures/mobile_journey_debug.png');
        }
        await archiveBtn.waitForDisplayed({ timeout: 5000 });
        await archiveBtn.click();
        await browser.pause(2000);

        // --- STEP 4: Final Verification ---
        console.log('[Journey] Step 4: Final Verification');

        await browser.waitUntil(async () => {
            const finalCards = await $$('[data-testid="lean-task-card"]');
            const victoryCard = await $('[data-testid="victory-lap-card"]');
            const emptyState = await $('.empty-state');

            const isVictoryExisting = await victoryCard.isExisting();
            const isEmptyExisting = await emptyState.isExisting();
            const cardsCount = finalCards.length;

            console.log(`[Journey] State Check: Cards=${cardsCount}, Victory=${isVictoryExisting}, Empty=${isEmptyExisting}`);

            if (cardsCount > 0) {
                const title = await finalCards[0].$('[data-testid="lean-task-title"]');
                if (await title.isExisting()) {
                    console.log(`[Journey] First Card Title: ${await title.getText()}`);
                }
            }

            return isVictoryExisting || isEmptyExisting || cardsCount === 0;
        }, {
            timeout: 10000,
            timeoutMsg: 'Expect Victory Lap, Empty State, or 0 cards after archiving Task A'
        });

        console.log('[Journey] ✅ Mobile Lifecycle Journey completed successfully');
    });
});
