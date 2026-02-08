import { browser, expect } from '@wdio/globals';
import { setupStackWithTasks } from '../e2e_utils.js';
import { emulateMobile } from '../mobile_utils.js';
import { cleanupVault } from '../test_utils.js';

describe('Mobile Viewport Collision (BUG-016)', () => {

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
        });
    });

    after(async function () {
        await cleanupVault();
    });

    it('should ensure focused task is visible and centered in mobile viewport', async () => {
        // 1. Setup a stack with enough tasks to ensure scrolling is needed
        const taskTitles = Array.from({ length: 5 }, (_, i) => `Task ${i + 1}`);
        console.log('[Test BUG-016] Setting up stack with 5 tasks');
        await setupStackWithTasks(taskTitles);

        // 2. Focus the first task initially
        await browser.pause(1000);

        // 3. Scroll down to Task 5 using shortcuts
        console.log('[Test BUG-016] Navigating down to Task 5');
        for (let i = 0; i < 4; i++) {
            await browser.keys(['j']);
            await browser.pause(100);
        }

        await browser.pause(1000); // Wait for smooth scroll

        // 4. Verify Task 10 is in the viewport
        const result = await browser.execute(() => {
            const focusedCard = document.querySelector('.todo-flow-task-card.is-focused');
            if (!focusedCard) return { found: false };

            const rect = focusedCard.getBoundingClientRect();
            const viewHeight = window.innerHeight;
            const viewWidth = window.innerWidth;

            // Check if it's within viewport boundaries
            const isVisible = (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= viewHeight &&
                rect.right <= viewWidth
            );

            // Check if it's roughly centered (vertical)
            const centerY = rect.top + (rect.height / 2);
            const isCentered = Math.abs(centerY - (viewHeight / 2)) < (viewHeight * 0.3); // Within 30% of center

            return {
                found: true,
                isVisible,
                isCentered,
                top: rect.top,
                bottom: rect.bottom,
                viewHeight
            };
        });

        console.log('[Test BUG-016] Viewport Check Result:', JSON.stringify(result, null, 2));

        expect(result.found).toBe(true);
        expect(result.isVisible).toBe(true);
        expect(result.isCentered).toBe(true);
    });

    it('should handle "ghost space" by keeping input visible during rename', async () => {
        // 1. Trigger rename on the currently focused task
        console.log('[Test BUG-016] Triggering rename (shortcut "e")');
        await browser.keys(['e']);
        await browser.pause(1000);

        // 2. Verify input is visible
        const inputResult = await browser.execute(() => {
            const input = document.querySelector('.todo-flow-title-input');
            if (!input) return { found: false };

            const rect = input.getBoundingClientRect();
            const viewHeight = window.innerHeight;

            return {
                found: true,
                isVisible: rect.top >= 0 && rect.bottom <= viewHeight,
                top: rect.top,
                bottom: rect.bottom
            };
        });

        console.log('[Test BUG-016] Input Visibility Result:', JSON.stringify(inputResult, null, 2));
        expect(inputResult.found).toBe(true);
        expect(inputResult.isVisible).toBe(true);
    });
});
