import { browser, expect } from '@wdio/globals';
import { setupStackWithTasks, focusStack } from '../e2e_utils.js';
import { emulateMobile } from '../mobile_utils.js';
import { cleanupVault } from '../test_utils.js';

describe('Mobile Viewport Correction (BUG-018)', () => {

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

    it('should center the Start Time input in the viewport on mobile', async () => {
        // 1. Setup a stack with enough tasks to ensure scrolling
        const taskTitles = Array.from({ length: 8 }, (_, i) => `Task ${i + 1}`);
        await setupStackWithTasks(taskTitles);
        await focusStack();

        // 2. Click the edit icon for Start Time on the last task
        console.log('[Test BUG-018] Clicking edit icon for Task 8 Start Time');
        await browser.execute(() => {
            const taskCards = document.querySelectorAll('.todo-flow-task-card');
            const lastTask = taskCards[7];
            const timeCol = lastTask?.querySelector('.time-col') as HTMLElement;
            if (timeCol) timeCol.click();
        });

        // 3. Wait for the keyboard animation window (300ms + buffer)
        await browser.pause(600);

        // 4. Verify the time input is centered
        const result = await browser.execute(() => {
            const input = document.querySelector('.todo-flow-time-input');
            if (!input) return { found: false };

            const rect = input.getBoundingClientRect();
            const viewHeight = window.innerHeight;

            // Check if it's within viewport boundaries
            const isVisible = rect.top >= 0 && rect.bottom <= viewHeight;

            // Check centering: the center of the input should be close to the center of the viewport
            const inputCenterY = rect.top + (rect.height / 2);
            const viewportCenterY = viewHeight / 2;
            const offsetFromCenter = Math.abs(inputCenterY - viewportCenterY);

            // Allow 15% tolerance of viewport height for "centering"
            const isCentered = offsetFromCenter < (viewHeight * 0.15);

            return {
                found: true,
                isVisible,
                isCentered,
                inputCenterY,
                viewportCenterY,
                offsetFromCenter,
                viewHeight
            };
        });

        console.log(`[Test BUG-018] Centering Check Result: found=${result.found}, isVisible=${result.isVisible}, isCentered=${result.isCentered}`);
        if (result.found) {
            console.log(`[Test BUG-018] RAW: inputCenterY=${result.inputCenterY}, viewportCenterY=${result.viewportCenterY}, offset=${result.offsetFromCenter}, viewHeight=${result.viewHeight}`);
        }

        expect(result.found).toBe(true);
        expect(result.isVisible).toBe(true);
        expect(result.isCentered).toBe(true);
    });
});
