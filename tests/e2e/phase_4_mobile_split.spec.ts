import { browser, expect, $, $$ } from '@wdio/globals';
import { emulateMobile } from './mobile_utils.js';

describe('Phase 4: Skeptical Specs - Mobile Structural Split', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });

        // Ensure a task exists
        await browser.execute((content) => {
            // @ts-ignore
            app.vault.adapter.write('todo-flow/CurrentStack.md', content);
        }, '- [ ] [[Root Task]]\n  - [ ] [[Child task]]');
        await browser.execute('app.commands.executeCommandById("todo-flow:reload-stack")');
        await browser.pause(2000);

        await emulateMobile();
    });

    it('should use the "FocusStack" component on mobile and exclude desktop logic', async () => {
        await browser.execute('app.commands.executeCommandById("todo-flow:open-daily-stack")');

        // Force viewMode to focus for the test (simulating the Svelte effect that should happen on mobile)
        await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            view.component.setViewMode('focus');
        });
        await browser.pause(500);

        // 1. Check for Focus component marker
        const focusStack = await $('[data-view-type="focus"]');
        expect(await focusStack.isExisting()).toBe(true); // SHOULD FAIL: Monolith doesn't have this marker yet

        // 2. Assert NO drag handles (Architecture logic excluded from Focus view)
        const dragHandle = await $('.drag-handle');
        expect(await dragHandle.isExisting()).toBe(false); // SHOULD FAIL: Monolith has them everywhere

        // 3. Assert NO desktop-specific info (e.g., specific index display required in Focus mode)
        const indexDisplay = await $('.index-display');
        await indexDisplay.waitForExist({ timeout: 5000 });
        expect(await indexDisplay.isExisting()).toBe(true);
    });
});
