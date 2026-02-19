import { browser, expect } from '@wdio/globals';
import { emulateMobile } from './mobile_utils.js';

describe('Phase 0: View Unification [SKEPTICAL SPEC]', () => {
    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await emulateMobile();
    });

    it('should use universal StackView on mobile, not LeanStackView', async () => {
        // 1. Open the Daily Stack
        await browser.execute(() => {
            app.commands.executeCommandById('todo-flow:open-daily-stack');
        });
        await browser.pause(2000);

        // 2. Inspect the view constructor name via internal API
        const viewInfo = await browser.execute(() => {
            // @ts-ignore
            const leaf = app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
            if (!leaf || !leaf.view) return 'NOT_FOUND';

            return {
                constructorName: leaf.view.constructor.name,
                viewType: leaf.view.getViewType()
            };
        });

        // Expected: todo-flow-stack-view
        expect(viewInfo.viewType).toBe('todo-flow-stack-view');
    });
});
