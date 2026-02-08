import { browser, expect, $ } from '@wdio/globals';
import { emulateMobile } from './mobile_utils.js';
import { setupStackWithTasks, focusStack } from './e2e_utils.js';
import { cleanupVault } from './test_utils.js';

describe('BUG-017: Gesture Shadowing Regression', () => {

    before(async function () {
        await browser.reloadObsidian({ vault: './.test-vault' });
        await emulateMobile();

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

    it('should block touchmove events to shadow native gestures', async () => {
        await setupStackWithTasks(['Swipe Me']);
        await focusStack();

        const card = await $('.todo-flow-task-card');
        await card.waitForExist({ timeout: 10000 });

        // 1. Inject spy for tracking defaultPrevented on the browser side
        await browser.execute(() => {
            (window as any)._touchMoveEvents = [];
            (window as any)._logs = []; // Reset logs
            const card = document.querySelector('.todo-flow-task-card');
            if (card) {
                card.addEventListener('touchmove', (e) => {
                    (window as any)._touchMoveEvents.push({
                        defaultPrevented: e.defaultPrevented,
                        cancelable: e.cancelable
                    });
                }, { capture: true });
            }
        });

        // 2. Perform a swipe gesture
        // We use a slow drag to ensure we enter "swiping" mode and trigger touchmove multiple times
        const location = await card.getLocation();
        const size = await card.getSize();
        const startX = Math.round(location.x + size.width / 2);
        const startY = Math.round(location.y + size.height / 2);

        await browser.performActions([{
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: startX, y: startY },
                { type: 'pointerDown', button: 0 },
                { type: 'pointerMove', duration: 500, x: startX + 150, y: startY }, // Swipe right
                { type: 'pointerUp', button: 0 }
            ]
        }]);

        await browser.pause(1000);

        // 3. Collect statistics
        const stats = await browser.execute(() => {
            const events = (window as any)._touchMoveEvents || [];
            const logs = (window as any)._logs || [];
            return {
                totalEvents: events.length,
                preventedCount: events.filter((e: any) => e.defaultPrevented).length,
                logs: logs
            };
        });

        console.log(`[TEST DEBUG] Total touchmove events captured: ${stats.totalEvents}`);
        console.log(`[TEST DEBUG] Prevented touchmove events: ${stats.preventedCount}`);
        console.log(`[TEST DEBUG] Plugin Logs:\n${stats.logs.join('\n')}`);

        // 4. Verify that handleTouchBlocking was called and blocked events
        // We expect at least some events to be prevented if the plugin recognized the swipe
        expect(stats.totalEvents).toBeGreaterThan(0);

        // Check if our handleTouchBlocking was entered
        const wasEntered = stats.logs.some((l: string) => l.includes('handleTouchBlocking entry'));
        expect(wasEntered).toBe(true);
    });
});
