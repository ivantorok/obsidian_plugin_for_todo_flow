import { browser, $, expect } from '@wdio/globals';

describe('UX-002: Mobile Navigation Loop', () => {
    beforeEach(async () => {
        // Reset state and setup mobile mode
        await (browser as any).reloadObsidian();

        await browser.execute(() => {
            document.body.classList.add('is-mobile');
            document.body.classList.remove('is-desktop');
            // @ts-ignore
            if (window.app) {
                // @ts-ignore
                window.app.isMobile = true;
            }
            window.dispatchEvent(new Event('resize'));
        });

        // Initialize plugin settings
        await browser.execute(async () => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            if (plugin) {
                plugin.settings.targetFolder = 'todo-flow';
                plugin.settings.debug = true;
                if (plugin.logger) plugin.logger.setEnabled(true);
                await plugin.saveSettings();
            }
            // @ts-ignore
            window._logs = [];
        });

        // Create test files
        await browser.execute(async () => {
            // @ts-ignore
            const { vault } = app;
            const existing = vault.getAbstractFileByPath('todo-flow');
            if (existing) await vault.delete(existing, true);

            await vault.createFolder('todo-flow');
            await vault.create('todo-flow/Parent.md', '# Parent Task\n[[Child]]\nflow_state: shortlist');
            await vault.create('todo-flow/Child.md', '# Child Task\nflow_state: shortlist');
            console.log("[Test Setup] Files created");
        });

        await browser.pause(3000); // Wait for indexing

        // Open the stack
        await browser.execute(async () => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            await plugin.activateStack('todo-flow');
        });

        await browser.pause(2000); // Wait for view to open

        // Focus the container to ensure key events are captured
        await browser.execute(() => {
            // @ts-ignore
            const leaf = app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
            if (leaf) {
                // @ts-ignore
                app.workspace.setActiveLeaf(leaf, { focus: true });
                const container = document.querySelector('.todo-flow-stack-container') as HTMLElement;
                if (container) container.focus();
            }
        });

        await browser.pause(300);
    });

    it('should drill down and navigate back via UI button', async () => {
        // 1. Diagnostic PRE-CLICK
        const diagnostics = await browser.execute(async () => {
            // @ts-ignore
            const leaf = app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
            const view = leaf ? (leaf.view as any) : null;
            const tasks = view ? view.tasks || [] : [];
            const component = view ? view.component : null;

            return {
                taskCount: tasks.length,
                taskDetails: tasks.map((t: any) => ({
                    title: t.title,
                    id: t.id,
                    hasChildren: !!(t.children && t.children.length > 0),
                    childCount: t.children?.length || 0
                })),
                focusedIndex: component ? component.focusedIndex : 'N/A',
                rootPath: view ? view.rootPath : 'N/A'
            };
        });

        console.log('[Test Debug] Diagnostics PRE-CLICK:', JSON.stringify(diagnostics, null, 2));

        // 2. Click Parent Task (to focus or drill down)
        const parentCard = await $(`.todo-flow-task-card*=Parent Task`);
        await parentCard.waitForExist({ timeout: 15000 });
        console.log("[Test] Tapping Parent Task...");
        await parentCard.click();

        // Wait for potential drill-down (250ms tapTimer + navigation + buffer)
        await browser.pause(2500);

        // 3. Check if we drilled down, if not, tap again (maybe it wasn't focused)
        let currentDiagnostics = await browser.execute(async () => {
            // @ts-ignore
            const leaf = app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
            const view = leaf ? (leaf.view as any) : null;
            const tasks = view ? view.tasks || [] : [];
            const component = view ? view.component : null;
            return {
                taskTitles: tasks.map((t: any) => t.title),
                rootPath: view ? view.rootPath : 'N/A',
                canGoBack: component && component.getCanGoBack ? component.getCanGoBack() : 'N/A'
            };
        });
        console.log('[Test Debug] Diagnostics after first tap:', JSON.stringify(currentDiagnostics, null, 2));

        if (currentDiagnostics.rootPath !== 'todo-flow/Parent.md') {
            console.log("[Test] Not drilled down yet. Tapping again...");
            const parentCardRefreshed = await $(`.todo-flow-task-card*=Parent Task`);
            if (await parentCardRefreshed.isExisting()) {
                await parentCardRefreshed.click();
                await browser.pause(2500);

                currentDiagnostics = await browser.execute(async () => {
                    // @ts-ignore
                    const leaf = app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
                    const view = leaf ? (leaf.view as any) : null;
                    const tasks = view ? view.tasks || [] : [];
                    const component = view ? view.component : null;
                    return {
                        taskTitles: tasks.map((t: any) => t.title),
                        rootPath: view ? view.rootPath : 'N/A',
                        canGoBack: component && component.getCanGoBack ? component.getCanGoBack() : 'N/A'
                    };
                });
                console.log('[Test Debug] Diagnostics after second tap:', JSON.stringify(currentDiagnostics, null, 2));
            }
        }

        // 4. Verify we are in the child stack
        expect(currentDiagnostics.rootPath).toBe('todo-flow/Parent.md');
        expect(currentDiagnostics.taskTitles).toContain('Child Task');

        // 5. Verify back button and click it
        const backBtn = await $('.back-nav-btn');
        await backBtn.waitForExist({ timeout: 10000 });
        console.log("[Test] Clicking back button...");
        await backBtn.click();
        await browser.pause(1500);

        // 6. Verify we are back in the parent stack
        const finalDiagnostics = await browser.execute(async () => {
            // @ts-ignore
            const leaf = app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
            const view = leaf ? (leaf.view as any) : null;
            const tasks = view ? view.tasks || [] : [];
            return {
                taskCount: tasks.length,
                titles: tasks.map((t: any) => t.title),
                rootPath: view ? view.rootPath : 'N/A'
            };
        });
        console.log('[Test Debug] Final Diagnostics:', JSON.stringify(finalDiagnostics, null, 2));

        expect(finalDiagnostics.rootPath).toBe('todo-flow');
        expect(finalDiagnostics.titles).toContain('Parent Task');
    });
});
