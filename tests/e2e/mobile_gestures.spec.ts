import { browser, expect, $, $$ } from '@wdio/globals';
import { emulateMobile } from './mobile_utils.js';

describe('Mobile Gestures (BUG-010)', () => {
    beforeEach(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await emulateMobile();
        // Clear logs
        await browser.execute(() => { (window as any)._logs = []; });
    });

    afterEach(async function () {
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

    it('should isolate Swipe Right (Complete) and NOT open Left Side Panel', async () => {
        // Standard Obsidian Mobile behavior: Swipe Right from edge or content often opens Left Sidebar.
        // We want to verify that swiping our task card DOES NOT open the sidebar, but DOES toggle the task.

        // 1. Setup
        await setupStackWithTasks(['Swipe Test Task']);
        const card = await $('.todo-flow-task-card');
        expect(card).toExist();

        // 2. Perform Swipe Right (Start left-ish but avoid handle, move right)
        // Center-Left of card, but at least 100px in to avoid handle
        const size = await card.getSize();
        const loc = await card.getLocation();

        const startX = Math.round(loc.x + size.width * 0.2);
        const startY = Math.round(loc.y + size.height / 2);
        const endX = Math.round(loc.x + 350);
        const endY = startY;

        console.log(`[Test] Swiping Right from ${startX},${startY} to ${endX},${endY}`);

        // @ts-ignore
        await browser.performActions([{
            type: 'pointer',
            id: 'pointer1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: startX, y: startY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 100 },
                { type: 'pointerMove', duration: 800, x: endX, y: endY },
                { type: 'pointerUp', button: 0 }
            ]
        }]);

        // @ts-ignore
        await browser.pause(1000);

        // 3. Verify Plugin Action: Task should be done (strikethrough class)
        // Note: DEFAULT_SETTINGS usually has swipeRightAction: 'complete'
        const isDone = await card.getAttribute('class');
        expect(isDone).toContain('is-done');

        // 4. Verify Isolation: Left Side Panel should NOT be active/open
        // In Obsidian mobile, the sidebar usually has class '.mobile-drawer.mod-left' and checking styling or existence.
        // Or we check if the workspace-ribbon-side is visible. 
        // A robust check: The Stack View should still be fully visible/interactive.

        const leftDrawer = await $('.workspace-drawer.mod-left');
        const isDrawerOpen = await leftDrawer.isExisting() && await leftDrawer.isDisplayed();

        if (isDrawerOpen) {
            console.error('FAIL: Left Drawer is OPEN!');
        }
        expect(isDrawerOpen).toBe(false);
    });

    it('should isolate Swipe Left (Archive) and NOT open Right Side Panel', async () => {
        await setupStackWithTasks(['Archive Test Task']);
        const card = await $('.todo-flow-task-card');
        expect(card).toExist();

        // 2. Perform Swipe Left (Start right, move left)
        const size = await card.getSize();
        const loc = await card.getLocation();

        const startX = Math.round(loc.x + size.width * 0.8); // Start further in (was 0.9)
        const startY = Math.round(loc.y + size.height / 2);
        const endX = Math.round(loc.x - 200); // Move left
        const endY = startY;

        console.log(`[Test] Swiping Left from ${startX},${startY} to ${endX},${endY}`);

        // @ts-ignore
        await browser.performActions([{
            type: 'pointer',
            id: 'pointer1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: startX, y: startY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 100 },
                { type: 'pointerMove', duration: 800, x: endX, y: endY },
                { type: 'pointerUp', button: 0 }
            ]
        }]);

        // @ts-ignore
        await browser.pause(1000);

        // 3. Verify Plugin Action: Task should be archived (removed from view)
        // DEFAULT_SETTINGS usually swipeLeftAction: 'archive'
        const cards = await $$('.todo-flow-task-card');
        expect(cards.length).toBe(0);

        // 4. Verify Isolation
        const rightDrawer = await $('.workspace-drawer.mod-right');
        const isDrawerOpen = await rightDrawer.isExisting() && await rightDrawer.isDisplayed();
        expect(isDrawerOpen).toBe(false);
    });

    it('should trigger Force Open on Long Press when configured', async () => {
        // 1. Setup Task
        await setupStackWithTasks(['Long Press Test Task']);
        const card = await $('.todo-flow-task-card');
        expect(card).toExist();

        // 2. Configure Long Press Action to 'force-open'
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            app.plugins.plugins['todo-flow'].settings.longPressAction = 'force-open';
        });

        // 3. Perform Long Press (Hold > 500ms)
        const size = await card.getSize();
        const loc = await card.getLocation();
        const startX = Math.round(loc.x + size.width / 2);
        const startY = Math.round(loc.y + size.height / 2);

        console.log(`[Test] Long Pressing at ${startX},${startY}`);

        // @ts-ignore
        await browser.performActions([{
            type: 'pointer',
            id: 'pointer1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: startX, y: startY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 700 }, // > 500ms threshold
                { type: 'pointerUp', button: 0 }
            ]
        }]);

        // @ts-ignore
        await browser.pause(1000);

        // 4. Verify Force Open (File should be open in Markdown view)
        // Check active leaf view type
        // @ts-ignore
        const viewType = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.activeLeaf?.view.getViewType();
        });

        console.log(`[Test] Active View Type after Long Press: ${viewType}`);
        expect(viewType).toBe('markdown');

        // Optional: Verify file name match 
        // @ts-ignore
        const activeFile = await browser.execute(() => app.workspace.getActiveFile()?.basename);
        expect(activeFile).toContain('Long-Press-Test-Task');
    });
});
