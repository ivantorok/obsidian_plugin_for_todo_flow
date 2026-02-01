import { browser, expect, $ } from '@wdio/globals';

describe('Functional Tests: Commands & Settings', () => {
    before(async function () {
        // Ensure we are in the correct context
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    it('should open Daily Stack view via command', async () => {
        // 1. Execute the command to open the stack
        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');

        // 2. Wait for the view to appear (it might take a split second)
        // We look for a leaf that contains our view type. 
        // Based on main.ts, the view type is VIEW_TYPE_STACK = 'todo-flow-stack-view' usually, 
        // but let's check for the DOM element class or attribute if we don't know the exact string constant here.
        // Or we can check if the leaf is active.

        // Let's use browser.execute to check the internal state of Obsidian workspace
        // This is more robust than relying on DOM classes that might change.
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => {
                // @ts-ignore
                const leaves = app.workspace.getLeavesOfType('todo-flow-stack-view');
                return leaves.length > 0;
            });
        }, {
            timeout: 5000,
            timeoutMsg: 'Stack View did not open within 5 seconds'
        });

        // 3. Verify it is visible in DOM as well (belt and suspenders)
        const stackView = await $('.workspace-leaf-content[data-type="todo-flow-stack-view"]');
        await expect(stackView).toExist();

        console.log('[Test] ✅ Daily Stack View opened successfully.');
    });

    it('should toggle Developer Mode setting', async () => {
        // 1. Get initial state
        // @ts-ignore
        const initialState = await browser.execute(() => {
            // @ts-ignore
            return app.plugins.plugins['obsidian_plugin_for_todo_flow']?.settings?.debug ?? app.plugins.plugins['todo-flow']?.settings?.debug;
        });

        console.log(`[Test] Initial Debug State: ${initialState}`);

        // 2. Execute Toggle Command
        // @ts-ignore
        await browser.execute('app.commands.executeCommandById("todo-flow:toggle-dev-mode")');

        // 3. Get new state
        // @ts-ignore
        const newState = await browser.execute(() => {
            // @ts-ignore
            return app.plugins.plugins['obsidian_plugin_for_todo_flow']?.settings?.debug ?? app.plugins.plugins['todo-flow']?.settings?.debug;
        });

        console.log(`[Test] New Debug State: ${newState}`);

        // 4. Updates should be opposite
        expect(newState).not.toBe(initialState);

        console.log('[Test] ✅ Developer Mode setting toggled successfully.');
    });
});
