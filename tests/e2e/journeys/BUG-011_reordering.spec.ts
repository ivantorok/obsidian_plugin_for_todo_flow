import { browser, expect, $$ } from '@wdio/globals';
import { setupStackWithTasks, focusStack } from '../e2e_utils.js';
import { emulateMobile } from '../mobile_utils.js';
import { cleanupVault } from '../test_utils.js';

describe('Mobile Card Body Drag (BUG-011)', () => {

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

    it('should reorder tasks via touch drag and drop on handles (BASELINE)', async () => {
        const taskTitles = ['Task 1', 'Task 2'];
        await setupStackWithTasks(taskTitles);
        await focusStack();

        const cards = await $$('.todo-flow-task-card');
        const handle1 = await cards[0].$('.drag-handle');
        const card2 = cards[1];

        const location1 = await handle1.getLocation();
        // Drag Task 1 handle to Task 2 position
        await browser.action('pointer', { parameters: { pointerType: 'touch' } })
            .move({ duration: 0, origin: handle1 })
            .down({ button: 0 }) // left button / touch
            .pause(500)
            .move({ duration: 1000, origin: card2, y: 20 })
            .up({ button: 0 })
            .perform();

        await browser.pause(2000);

        const finalCards = await $$('.todo-flow-task-card');
        const finalTitles: string[] = [];
        for (const card of finalCards) {
            finalTitles.push(await card.$('.title').getText());
        }

        console.log('[Test BUG-011 Handle] Final Titles:', finalTitles);
        // Task 1 should be after Task 2
        expect(finalTitles[0]).toBe('Task 2');
        expect(finalTitles[1]).toBe('Task 1');
    });

    it.skip('should reorder tasks via touch drag and drop on card body (BUG-011 REPRO)', async () => {
        // Reset stack for second attempt
        const taskTitles = ['Task A', 'Task B'];
        await setupStackWithTasks(taskTitles);
        await focusStack();

        const cards = await $$('.todo-flow-task-card');
        const cardA = cards[0];
        const cardB = cards[1];

        console.log('[Test BUG-011 Body] Dragging from body of Task A to body of Task B');

        // Drag Task A body to Task B position
        await browser.action('pointer', { parameters: { pointerType: 'touch' } })
            .move({ duration: 0, origin: cardA, x: 50 }) // Offset from left to hit body
            .down({ button: 0 })
            .pause(500)
            .move({ duration: 1000, origin: cardB, x: 50, y: 20 })
            .up({ button: 0 })
            .perform();

        await browser.pause(2000);

        const finalCards = await $$('.todo-flow-task-card');
        const finalTitles: string[] = [];
        for (const card of finalCards) {
            finalTitles.push(await card.$('.title').getText());
        }

        console.log('[Test BUG-011 Body] Final Titles:', finalTitles);
        // Task A should be after Task B
        expect(finalTitles[0]).toBe('Task B');
        expect(finalTitles[1]).toBe('Task A');
    });

    it.skip('should reorder tasks via touch drag and drop on card body (BUG-011 REPRO - SLOPPY DRAG)', async () => {
        // Reset stack for second attempt
        const taskTitles = ['Task X', 'Task Y'];
        await setupStackWithTasks(taskTitles);
        await focusStack();

        const cards = await $$('.todo-flow-task-card');
        const cardX = cards[0];
        const cardY = cards[1];

        console.log('[Test BUG-011 Body] Sloppy Dragging from body of Task X to body of Task Y');

        // Sloppy Drag: Significant horizontal move during vertical move
        await browser.action('pointer', { parameters: { pointerType: 'touch' } })
            .move({ duration: 0, origin: cardX, x: 50 })
            .down({ button: 0 })
            .pause(500)
            .move({ duration: 1000, origin: cardY, x: 120, y: 20 }) // x: 70 move from start x: 50
            .up({ button: 0 })
            .perform();

        await browser.pause(2000);

        const finalCards = await $$('.todo-flow-task-card');
        const finalTitles: string[] = [];
        for (const card of finalCards) {
            finalTitles.push(await card.$('.title').getText());
        }

        console.log('[Test BUG-011 Body] Final Titles:', finalTitles);
        // Task X should be after Task Y
        expect(finalTitles[0]).toBe('Task Y');
        expect(finalTitles[1]).toBe('Task X');
    });

});
