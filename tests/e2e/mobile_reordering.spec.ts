import { browser, expect, $, $$ } from '@wdio/globals';
import { emulateMobile } from './mobile_utils.js';
import { cleanupVault } from './test_utils.js';

describe('Mobile Reordering (BUG-004)', () => {
    beforeEach(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await emulateMobile();
        // Clear logs
        await browser.execute(() => { (window as any)._logs = []; });
    });

    afterEach(async function () {
        // Clean up vault state to prevent pollution
        await cleanupVault();

        // Log output
        const logs = await browser.execute(() => (window as any)._logs || []);
        console.log('[Browser Logs (window._logs)]');
        logs.forEach((log: string) => console.log(log));
    });

    async function setupStackWithTasks(taskNames: string[]) {
        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("todo-flow:open-todo-dump")');
        // @ts-ignore
        await browser.pause(1000);

        const dumpInput = await $('textarea.todo-flow-dump-input');
        for (const taskName of taskNames) {
            await dumpInput.setValue(taskName);
            // @ts-ignore
            await browser.keys(['Enter']);
            // @ts-ignore
            await browser.pause(300);
        }

        await dumpInput.setValue('done');
        // @ts-ignore
        await browser.keys(['Enter']);
        // @ts-ignore
        await browser.pause(1000);

        // Triage: keep all
        for (let i = 0; i < taskNames.length; i++) {
            // @ts-ignore
            await browser.keys(['k']);
            // @ts-ignore
            await browser.pause(500);
        }

        // Wait for Stack
        // @ts-ignore
        await browser.pause(1000);
    }

    it('should reorder tasks via touch drag and drop on handles', async () => {
        await setupStackWithTasks(['Task A', 'Task B']);

        const handles = await $$('.drag-handle');
        expect(handles.length).toBe(2);

        const cards = await $$('.todo-flow-task-card');
        const taskA_handle = handles[0];
        const taskB_card = cards[1];

        const startLocation = await taskA_handle.getLocation();
        const endLocation = await taskB_card.getLocation();
        const cardSize = await taskB_card.getSize();

        console.log(`[Test] Dragging from handle at ${JSON.stringify(startLocation)} to card at ${JSON.stringify(endLocation)}`);

        // Target the center of the handle and the center of the target card
        const startX = Math.round(startLocation.x + 10);
        const startY = Math.round(startLocation.y + 10);
        const endX = Math.round(endLocation.x + cardSize.width / 2);
        const endY = startY + 180; // Move down 180px

        // Perform drag and drop using pointer actions (simulating touch)
        // @ts-ignore
        await browser.performActions([{
            type: 'pointer',
            id: 'pointer1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: startX, y: startY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 500 }, // Wait for potential long press handling
                { type: 'pointerMove', duration: 1000, x: endX, y: endY },
                { type: 'pointerUp', button: 0 }
            ]
        }]);

        // @ts-ignore
        await browser.pause(1500);

        // Verify order
        // @ts-ignore
        const titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            // @ts-ignore
            return view.getTasks().map(t => t.title);
        });

        console.log('[Test] Final titles:', titles);
        expect(titles).toEqual(['Task B', 'Task A']);
    });

    it('should reorder tasks via touch drag and drop on card body', async () => {
        await setupStackWithTasks(['Card 1', 'Card 2']);

        const cards = await $$('.todo-flow-task-card');
        expect(cards.length).toBe(2);

        const card1 = cards[0];
        const card2 = cards[1];

        const startLoc = await card1.getLocation();
        const endLoc = await card2.getLocation();
        const size = await card1.getSize();

        // Click in the center of the card
        const startX = Math.round(startLoc.x + size.width / 2);
        const startY = Math.round(startLoc.y + size.height / 2);
        const endX = Math.round(endLoc.x + size.width / 2);
        const endY = Math.round(endLoc.y + size.height / 2);

        console.log(`[Test] Dragging from card body at ${startX},${startY} to target at ${endX},${endY}`);

        // Perform drag and drop
        // @ts-ignore
        await browser.performActions([{
            type: 'pointer',
            id: 'pointer1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: startX, y: startY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 500 },
                { type: 'pointerMove', duration: 1000, x: endX, y: endY },
                { type: 'pointerUp', button: 0 }
            ]
        }]);

        // @ts-ignore
        await browser.pause(1500);

        // Verify order
        // @ts-ignore
        const titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            // @ts-ignore
            return view.getTasks().map(t => t.title);
        });

        console.log('[Test] Final titles:', titles);
        expect(titles).toEqual(['Card 2', 'Card 1']);
    });
});
