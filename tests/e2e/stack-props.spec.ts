import { browser, expect } from '@wdio/globals';
import { setupStackWithTasks } from './e2e_utils.js';

describe('Stack Properties (Duration, Anchor, Complete)', () => {
    beforeEach(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    it('should adjust duration with d/f keys', async () => {
        await setupStackWithTasks(['Duration Test']);

        // Get initial duration (default 30)
        // @ts-ignore
        let duration = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].duration;
        });
        console.log('[Test] Initial duration:', duration);
        expect(duration).toBe(30);

        // Increase with f
        // @ts-ignore
        await browser.keys(['f']);
        // @ts-ignore
        await browser.pause(300);

        // @ts-ignore
        duration = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].duration;
        });
        console.log('[Test] After f:', duration);
        expect(duration).toBe(45);

        // Decrease with d
        // @ts-ignore
        await browser.keys(['d']);
        // @ts-ignore
        await browser.pause(300);

        // @ts-ignore
        duration = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].duration;
        });
        console.log('[Test] After d:', duration);
        expect(duration).toBe(30);

        console.log('[Test] ✅ Duration adjustment works correctly');
    });

    it('should toggle anchor with Shift+F', async () => {
        await setupStackWithTasks(['Anchor Test']);

        // Check initial state
        // @ts-ignore
        let isAnchored = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].isAnchored;
        });
        expect(isAnchored).toBe(false);

        // Toggle anchor with Shift+F
        // @ts-ignore
        await browser.keys(['F']);
        // @ts-ignore
        await browser.pause(500);

        // @ts-ignore
        isAnchored = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].isAnchored;
        });
        expect(isAnchored).toBe(true);

        // Toggle off
        // @ts-ignore
        await browser.keys(['F']);
        // @ts-ignore
        await browser.pause(500);

        // @ts-ignore
        isAnchored = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].isAnchored;
        });
        expect(isAnchored).toBe(false);

        console.log('[Test] ✅ Anchor toggle works correctly');
    });

    it('should toggle task completion with x key', async () => {
        await setupStackWithTasks(['Toggle Test']);

        // COMPLETE: Mark done with x
        // @ts-ignore
        await browser.keys(['x']);
        // @ts-ignore
        await browser.pause(500);

        // @ts-ignore
        let status = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].status;
        });
        expect(status).toBe('done');
        console.log('[Test] ✅ Mark as done works');

        // UNCOMPLETE: Toggle back to todo with x
        // @ts-ignore
        await browser.keys(['x']);
        // @ts-ignore
        await browser.pause(500);

        // @ts-ignore
        status = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].status;
        });
        expect(status).toBe('todo');
        console.log('[Test] ✅ Toggle back to todo works');

        console.log('[Test] ✅ Task completion toggle works correctly');
    });

});
