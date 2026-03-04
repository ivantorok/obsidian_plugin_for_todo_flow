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

        const taskACard = await $('.focus-card.is-focused');
        await taskACard.waitForDisplayed({ timeout: 10000 });

        const taskTitle = await taskACard.$('.focus-title');
        expect(await taskTitle.getText()).toBe('Task A');

        // --- STEP 2: Verify Duration (30m default) ---
        console.log('[Journey] Step 2: Verifying Duration');
        const durationText = await taskACard.$('.focus-duration-text');
        expect(await durationText.getText()).toBe('30m');

        // --- STEP 3: Archive Task A ---
        console.log('[Journey] Step 3: Archiving Task A');
        // Use contains-selector to be more robust against whitespace
        const archiveBtn = await $('.focus-actions').$('button*=Archive');
        await archiveBtn.waitForExist({ timeout: 5000 });
        console.log('[Journey] Clicking Archive button...');

        await browser.execute((btn: any) => {
            console.log(`[Browser] Clicking Archive button. Text=${btn.innerText}, Disabled=${btn.disabled}`);
            btn.click();
        }, archiveBtn);

        // Wait for the card to actually disappear or victory lap to appear
        await browser.waitUntil(async () => {
            const cards = await $$('.focus-card');
            const isGone = !(await taskACard.isExisting());
            return cards.length === 0 || isGone;
        }, {
            timeout: 5000,
            timeoutMsg: 'Expected Task A card to disappear after archiving'
        });
        await browser.pause(1000); // Small buffer for any final animation/state update

        // --- STEP 4: Final Verification ---
        console.log('[Journey] Step 4: Final Verification');

        await browser.waitUntil(async () => {
            const finalCards = await $$('.todo-flow-task-card'); // Use generic class
            const victoryCard = await $('.todo-flow-victory-lap-card');
            const emptyState = await $('.empty-state');
            const zenCard = await $('.zen-card');

            const isVictoryExisting = await victoryCard.isExisting();
            const isEmptyExisting = await emptyState.isExisting();
            const isZenExisting = await zenCard.isExisting();
            const cardsCount = finalCards.length;

            console.log(`[Journey] State Check: Total Cards=${cardsCount}, Victory=${isVictoryExisting}, Empty=${isEmptyExisting}, Zen=${isZenExisting}`);

            if (cardsCount > 0) {
                // If cards exist, check if they are actually task cards (not zen cards)
                // In mobile, we might have exactly 1 zen card which is also a focus-card
                const firstCard = finalCards[0];
                const isTask = await firstCard.getAttribute('data-index') !== null || await firstCard.$('.focus-title').isExisting();
                if (isTask) {
                    const title = await firstCard.$('.focus-title');
                    if (await title.isExisting()) {
                        console.log(`[Journey] Found ACTIVE Card: ${await title.getText()}`);
                    }
                    return false; // Still have tasks
                }
            }

            return isVictoryExisting || isEmptyExisting || isZenExisting || cardsCount === 0;
        }, {
            timeout: 10000,
            timeoutMsg: 'Expect Victory Lap, Empty State, or Zen Card after archiving Task A. Still found task cards.'
        });

        console.log('[Journey] ✅ Mobile Lifecycle Journey completed successfully');
    });
});
