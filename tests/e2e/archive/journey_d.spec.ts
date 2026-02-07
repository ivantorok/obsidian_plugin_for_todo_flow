import { browser, expect, $, $$ } from '@wdio/globals';

describe('Journey D: Mobile Gestures', () => {
    beforeEach(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    // Helper function to create tasks via Dump → Triage → Stack flow
    async function setupStackWithTasks(taskNames: string[]) {
        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("todo-flow:open-todo-dump")');
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getLeavesOfType('todo-flow-dump-view').length > 0;
            });
        }, { timeout: 5000 });

        const dumpInput = await $('textarea.todo-flow-dump-input');
        for (const taskName of taskNames) {
            await dumpInput.setValue(taskName);
            // @ts-ignore
            await browser.keys(['Enter']);
            // @ts-ignore
            await browser.pause(300);
        }

        // @ts-ignore
        await dumpInput.setValue('done');
        // @ts-ignore
        await browser.keys(['Enter']);

        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getLeavesOfType('todo-flow-triage-view').length > 0;
            });
        }, { timeout: 5000 });

        for (let i = 0; i < taskNames.length; i++) {
            // @ts-ignore
            await browser.keys(['k']);
            // @ts-ignore
            await browser.pause(500);
        }

        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getLeavesOfType('todo-flow-stack-view').length > 0;
            });
        }, { timeout: 5000 });
    }

    async function swipe(element: WebdriverIO.Element, direction: 'left' | 'right') {
        // @ts-ignore
        await browser.execute(async (el: HTMLElement, dir: 'left' | 'right') => {
            const rect = el.getBoundingClientRect();
            const startX = rect.left + rect.width / 2;
            const startY = rect.top + rect.height / 2;
            const dx = dir === 'right' ? 250 : -250;

            const dispatch = (type: string, x: number) => {
                const ev = new PointerEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    clientX: x,
                    clientY: startY,
                    pointerType: 'touch',
                    pointerId: 1
                });
                el.dispatchEvent(ev);
            };

            dispatch('pointerdown', startX);
            await new Promise(r => setTimeout(r, 50));
            dispatch('pointermove', startX + dx);
            await new Promise(r => setTimeout(r, 50));
            dispatch('pointerup', startX + dx);
        }, element, direction);
        // @ts-ignore
        await browser.pause(500); // Wait for transition
    }

    async function doubleTap(element: WebdriverIO.Element) {
        // @ts-ignore
        await browser.execute((el: HTMLElement) => {
            const rect = el.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;

            const baseEvent = { bubbles: true, clientX: x, clientY: y, pointerType: 'touch' };
            // @ts-ignore
            el.dispatchEvent(new PointerEvent('pointerdown', baseEvent));
            // @ts-ignore
            el.dispatchEvent(new PointerEvent('pointerup', baseEvent));

            // The component handles double-tap timing via MouseEvent (onclick)
            el.click();
        }, element);

        // Small pause to separate clicks but stay within double-tap threshold (300ms)
        // @ts-ignore
        await browser.pause(50);

        // @ts-ignore
        await browser.execute((el: HTMLElement) => {
            el.click();
        }, element);

        // @ts-ignore
        await browser.pause(500);
    }

    it('should complete task with swipe right', async () => {
        await setupStackWithTasks(['Swipe Target']);
        const card = await $('.todo-flow-task-card');
        await swipe(card, 'right');

        // Verify it marked as done
        await expect(card).toHaveClass('is-done');
        console.log('[Test] ✅ Swipe Right (Complete) works');
    });

    it('should archive task with swipe left', async () => {
        await setupStackWithTasks(['Archive Target']);
        const card = await $('.todo-flow-task-card');
        await swipe(card, 'left');

        // Verify it disappeared
        // @ts-ignore
        await browser.waitUntil(async () => {
            const count = await $$('.todo-flow-task-card').length;
            return count === 0;
        }, { timeout: 3000, timeoutMsg: 'Task did not disappear after swipe left' });
        console.log('[Test] ✅ Swipe Left (Archive) works');
    });

    it('should toggle anchor with double tap', async () => {
        await setupStackWithTasks(['Anchor Target']);
        const card = await $('.todo-flow-task-card');

        // Initially not anchored
        let hasAnchor = await card.$('.anchor-badge').isExisting();
        expect(hasAnchor).toBe(false);

        await doubleTap(card);

        // Now anchored
        hasAnchor = await card.$('.anchor-badge').isExisting();
        expect(hasAnchor).toBe(true);

        await doubleTap(card);
        // Back to released
        hasAnchor = await card.$('.anchor-badge').isExisting();
        expect(hasAnchor).toBe(false);

        console.log('[Test] ✅ Double Tap (Anchor) works');
    });

    it('should reorder tasks with manual drag and drop', async () => {
        await setupStackWithTasks(['Task A', 'Task B']);

        const cards = await $$('.todo-flow-task-card');
        // @ts-ignore
        await browser.waitUntil(async () => (await $$('.todo-flow-task-card').length) === 2, { timeout: 5000 });

        const handleA = await cards[0].$('.drag-handle');
        const cardB = cards[1];

        // @ts-ignore
        const locationA = await handleA.getLocation();
        // @ts-ignore
        const locationB = await cardB.getLocation();
        // @ts-ignore
        const sizeB = await cardB.getSize();

        // Drag Task A to the bottom of Task B
        // @ts-ignore
        await browser.execute(async (elHandle: HTMLElement, elB: HTMLElement) => {
            const elA = elHandle.closest('.todo-flow-task-card') as HTMLElement;
            const rectA = elA.getBoundingClientRect();
            const rectB = elB.getBoundingClientRect();

            const startX = rectA.left + 5;
            const startY = rectA.top + 5;
            const endX = rectB.left + rectB.width / 2;
            const endY = rectB.top + rectB.height - 5;

            const dispatch = (target: HTMLElement, type: string, x: number, y: number) => {
                target.dispatchEvent(new PointerEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    clientX: x,
                    clientY: y,
                    pointerType: 'touch',
                    pointerId: 1
                }));
            };

            // 1. Pointer Down on Handle
            dispatch(elHandle, 'pointerdown', startX, startY);
            await new Promise(r => setTimeout(r, 50));

            // 2. Pointer Move on Card (Card has the move listener)
            // Move down slightly to lock vertical intent
            dispatch(elA, 'pointermove', startX, startY + 20);
            await new Promise(r => setTimeout(r, 100));

            // 3. Move to target
            dispatch(elA, 'pointermove', endX, endY);
            await new Promise(r => setTimeout(r, 50));

            // 4. Pointer Up
            dispatch(elA, 'pointerup', endX, endY);
        }, handleA, cardB);

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
        expect(titles).toEqual(['Task B', 'Task A']);
        console.log('[Test] ✅ Drag & Drop Reordering works');
    });
});
