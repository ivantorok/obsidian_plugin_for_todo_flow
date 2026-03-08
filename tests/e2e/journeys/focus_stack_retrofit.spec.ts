import { browser, expect } from '@wdio/globals';

describe('Focus Stack Hard Shell Retrofit', () => {
    before(async () => {
        // Open the stack view and inject tasks
        await browser.execute(async () => {
            const app = (window as any).app;

            // Wait for plugin to be available
            let plugin = app.plugins.plugins['todo-flow'];
            let retries = 0;
            while (!plugin && retries < 10) {
                await new Promise(r => setTimeout(r, 500));
                plugin = app.plugins.plugins['todo-flow'];
                retries++;
            }

            if (!plugin) {
                console.error('[E2E-DEBUG] Plugin "todo-flow" not found after wait');
                return;
            }

            // Create tasks if none exist
            const tasks = await plugin.getTasksFromFolder('todo-flow');
            const taskIds = tasks.map((t: any) => t.id);
            if (taskIds.length === 0) {
                const t1 = await plugin.onCreateTask('Task 1', { duration: 30 });
                const t2 = await plugin.onCreateTask('Task 2', { duration: 45 });
                taskIds.push(t1.id, t2.id);
            }

            // Open and activate with EXPLICIT IDs (bypass query latency/emptiness)
            app.commands.executeCommandById('todo-flow:open-daily-stack');
            await plugin.activateStack(taskIds);
        });
        await browser.pause(2000);
    });

    beforeEach(async () => {
        // Reset state and ensure mobile mode
        await browser.execute(() => {
            const workspace = (window as any).app.workspace;
            const leaves = workspace.getLeavesOfType('todo-flow-stack-view');
            console.log('[E2E-DEBUG] Stack leaves:', leaves.length);
            const view = leaves[0]?.view;
            if (view) {
                console.log('[E2E-DEBUG] Setting focus mode');
                view.setViewMode('focus');
                if (view.component) {
                    view.component.setIsMobile(true);
                    console.log('[E2E-DEBUG] Mobile mode set');
                }
            }
        });
        await browser.pause(500);
    });

    it('should NOT have legacy action buttons (Complete, Archive, Anchor)', async () => {
        const stackContainer = await $('[data-testid="stack-container"]');
        await expect(stackContainer).toBeDisplayed();

        const completeBtn = await $('[data-testid="focus-complete-btn"]');
        const archiveBtn = await $('[data-testid="focus-archive-btn"]');
        const anchorBtn = await $('[data-testid="focus-anchor-btn"]');

        await expect(completeBtn).not.toExist();
        await expect(archiveBtn).not.toExist();
        await expect(anchorBtn).not.toExist();
    });

    it('should have the "Hard Shell" nav row and Title tap target', async () => {
        const titleEl = await $('.focus-title');
        await expect(titleEl).toBeDisplayed();

        const navRow = await $('.hard-shell-nav');
        await expect(navRow).toBeDisplayed();

        const nextBtn = await navRow.$('button=Next →');
        await expect(nextBtn).toBeDisplayed();
    });

    it('should open the DetailedTaskView when the title is clicked', async () => {
        const titleEl = await $('.focus-title');
        await expect(titleEl).toBeDisplayed();

        // Robust JS click to bypass overlap/interception in mobile mode
        await browser.execute((el) => {
            (el as HTMLElement).scrollIntoView();
            (el as HTMLElement).click();
        }, titleEl);

        // Verify the global modal is visible
        const detailedView = await $('[data-testid="detailed-task-view"]');
        await detailedView.waitForDisplayed({ timeout: 5000 });
        await expect(detailedView).toBeDisplayed();

        // Verify it contains management actions (Sovereign Control Panel)
        const anchorAction = await detailedView.$('button*=Anchor');
        await expect(anchorAction).toBeDisplayed();

        // Close the modal cleanly
        const closeBtn = await detailedView.$('.vanilla-back-btn');
        await closeBtn.click();
        await browser.pause(500);
        await expect(detailedView).not.toBeDisplayed();
    });

    it('should handle navigation correctly', async () => {
        const initialTitle = await $('.focus-title').getText();
        const nextBtn = await $('button=Next →');

        if (await nextBtn.isEnabled()) {
            // Scroll and use JS click to avoid obscurance
            await browser.execute((el) => {
                (el as HTMLElement).scrollIntoView();
                (el as HTMLElement).click();
            }, nextBtn);
            await browser.pause(500);
            const newTitle = await $('.focus-title').getText();
            expect(newTitle).not.toBe(initialTitle);
        }
    });
});
