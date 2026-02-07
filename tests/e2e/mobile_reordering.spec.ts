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

    it('should reorder tasks via touch drag and drop on card body', async () => {
        await setupStackWithTasks(['Card 1', 'Card 2']);

        const cards = await $$('.todo-flow-task-card');
        expect(cards.length).toBe(2);

        const card1 = cards[0];
        const card2 = cards[1];

        const startLocation = await card1.getLocation();
        const endLocation = await card2.getLocation();
        const cardSize = await card1.getSize();

        console.log(`[Test] Card 1 location: ${JSON.stringify(startLocation)}, size: ${JSON.stringify(cardSize)}`);
        console.log(`[Test] Card 2 location: ${JSON.stringify(endLocation)}`);

        // Target the center of the card body 1
        const startX = Math.round(startLocation.x + cardSize.width / 2);
        const startY = Math.round(startLocation.y + cardSize.height / 2);
        // Drag to a point that is definitely below the center of card 2
        // If card 1 is at y=0 and card 2 is at y=100, dragging to y=150 should move card 1 after card 2
        const dragDist = Math.round(endLocation.y - startLocation.y + cardSize.height);
        const endX = startX;
        const endY = startY + dragDist;

        console.log(`[Test] Dragging from ${startX},${startY} down by ${dragDist}px to ${endX},${endY}`);

        // Perform drag and drop using pointer actions (simulating touch)
        // @ts-ignore
        await browser.performActions([{
            type: 'pointer',
            id: 'pointer1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: startX, y: startY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 200 },
                { type: 'pointerMove', duration: 1000, x: endX, y: endY },
                { type: 'pointerUp', button: 0 }
            ]
        }]);

        // @ts-ignore
        await browser.pause(1000);

        // Fetch logs from browser
        // @ts-ignore
        const browserLogs = await browser.execute(() => {
            // @ts-ignore
            return window._logs || ['No logs found in window._logs'];
        });
        console.log('[Test] Browser Gesture Logs:');
        browserLogs.forEach(log => console.log(`  ${log}`));

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

    it('should reorder tasks via jittery touch drag on card body', async () => {
        await setupStackWithTasks(['Jitter 1', 'Jitter 2']);

        const cards = await $$('.todo-flow-task-card');
        const card1 = cards[0];
        const card2 = cards[1];

        const startLocation = await card1.getLocation();
        const endLocation = await card2.getLocation();
        const cardSize = await card1.getSize();

        const startX = Math.round(startLocation.x + cardSize.width / 2);
        const startY = Math.round(startLocation.y + cardSize.height / 2);

        // Target a point below Card 2
        const targetY = Math.round(endLocation.y + cardSize.height);

        // Perform "jittery" drag: move slightly left and right as we move down
        // @ts-ignore
        await browser.performActions([{
            type: 'pointer',
            id: 'pointer1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: startX, y: startY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 400 }, // Wait for long-press delay
                { type: 'pointerMove', duration: 200, x: startX + 10, y: startY + 50 },
                { type: 'pointerMove', duration: 200, x: startX - 10, y: startY + 100 },
                { type: 'pointerMove', duration: 200, x: startX + 10, y: startY + 150 },
                { type: 'pointerMove', duration: 200, x: startX, y: targetY },
                { type: 'pointerUp', button: 0 }
            ]
        }]);

        // @ts-ignore
        await browser.pause(1000);

        // Verify order
        // @ts-ignore
        const titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            // @ts-ignore
            return view.getTasks().map(t => t.title);
        });

        console.log('[Test] Final titles (jitter):', titles);
        expect(titles).toEqual(['Jitter 2', 'Jitter 1']);
    });
});
