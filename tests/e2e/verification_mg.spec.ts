import { browser, expect, $ } from '@wdio/globals';
import { emulateMobile } from './mobile_utils.js';

describe('Mobile Gesture Verification (MG-01 to MG-03) - Final Refined', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await emulateMobile();
    });

    beforeEach(async () => {
        await browser.execute(async () => {
            const persistencePath = 'todo-flow/CurrentStack.md';
            const adapter = app.vault.adapter;
            if (!(await adapter.exists('todo-flow'))) {
                await adapter.mkdir('todo-flow');
            }
            await adapter.write(persistencePath, '# Current Stack\n\n- [ ] [[SwipeTask]]');
            if (!(await adapter.exists('SwipeTask.md'))) {
                await app.vault.create('SwipeTask.md', '# Swipe Task');
            } else {
                // Reset file to clean state
                await adapter.write('SwipeTask.md', '# Swipe Task');
            }

            // Set swipe actions
            const plugin = (app as any).plugins.plugins['todo-flow'];
            plugin.settings.swipeRightAction = 'complete';
            plugin.settings.swipeLeftAction = 'archive';
            plugin.settings.doubleTapAction = 'anchor';
            await plugin.saveSettings();
        });

        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');
        await $('.todo-flow-stack-container').waitForExist({ timeout: 5000 });
        const card = await $('[data-testid="task-card-0"]');
        await card.waitForExist({ timeout: 5000 });
    });

    it('MG-01 & MG-02: Swipe Actions (Done/Archive)', async () => {
        const card = await $('[data-testid="task-card-0"]');
        await expect(card).toBeDisplayed();

        const location = await card.getLocation();
        const size = await card.getSize();

        // Use more extreme coordinates to guarantee threshold crossing
        const centerX = Math.round(location.x + size.width / 2);
        const startX = Math.round(location.x + 50);
        const endX = Math.round(location.x + size.width - 50);
        const y = Math.round(location.y + size.height / 2);

        console.log(`[Test] Swiping Right from ${startX} to ${endX} at y=${y}`);

        // 2. Swipe Right (Done)
        await browser.performActions([{
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: startX, y: y },
                { type: 'pointerDown', button: 0 },
                { type: 'pointerMove', duration: 300, x: endX, y: y },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await browser.pause(2000);

        const fileContent = await browser.execute(async () => {
            const file = app.vault.getAbstractFileByPath('SwipeTask.md');
            if (!file) return null;
            return await app.vault.read(file);
        });

        const logs = await browser.execute(() => (window as any)._logs || []);
        console.log('[Test MG] BROWSER LOGS after Swipe Right:', JSON.stringify(logs, null, 2));

        console.log('[Test] File content after Swipe Right:', fileContent);
        expect(fileContent).toContain('status: done');

        // 3. Swipe Left (Archive)
        // Reset
        await browser.execute(async () => {
            const file = app.vault.getAbstractFileByPath('SwipeTask.md');
            if (file) {
                await app.vault.process(file, (data) => data.replace('status: done', 'status: todo'));
            }
        });
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');
        await browser.pause(1000);

        console.log(`[Test] Swiping Left from ${endX} to ${startX} at y=${y}`);
        await browser.performActions([{
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: endX, y: y },
                { type: 'pointerDown', button: 0 },
                { type: 'pointerMove', duration: 300, x: startX, y: y },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await browser.pause(2000);

        const isArchived = await browser.execute(async () => {
            const file = app.vault.getAbstractFileByPath('SwipeTask.md');
            if (!file) return false;
            const content = await app.vault.read(file);
            return content.includes('flow_state: archive');
        });

        const secondLogs = await browser.execute(() => (window as any)._logs || []);
        console.log('[Test MG] BROWSER LOGS after Swipe Left:', JSON.stringify(secondLogs, null, 2));

        console.log('[Test] Is Archived after Swipe Left:', isArchived);
        expect(isArchived).toBe(true);
    });

    it('MG-03: Double Tap (Anchor)', async () => {
        const card = await $('[data-testid="task-card-0"]');
        const location = await card.getLocation();
        const size = await card.getSize();
        const x = Math.round(location.x + size.width / 2);
        const y = Math.round(location.y + size.height / 2);

        await browser.performActions([{
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: x, y: y },
                { type: 'pointerDown', button: 0 },
                { type: 'pointerUp', button: 0 },
                { type: 'pause', duration: 80 },
                { type: 'pointerDown', button: 0 },
                { type: 'pointerUp', button: 0 }
            ]
        }]);

        await browser.pause(2000);

        const isAnchored = await browser.execute(() => {
            return document.querySelector('[data-testid="task-card-0"]')?.classList.contains('anchored');
        });
        expect(isAnchored).toBe(true);
    });
});
