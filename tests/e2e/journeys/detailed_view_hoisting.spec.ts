import { browser, $, $$, expect } from '@wdio/globals';
import { setupStackWithTasks, focusStack } from '../e2e_utils.js';
import { cleanupVault } from '../test_utils.js';

describe('DetailedTaskView Hoisting: Global Accessibility', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });

        // Configure Plugin
        await browser.execute(async () => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            if (plugin) {
                plugin.settings.targetFolder = 'todo-flow';
                plugin.settings.debug = true;
                await plugin.saveSettings();
            }
        });
    });

    after(async function () {
        await cleanupVault();
    });

    afterEach(async function () {
        // @ts-ignore
        if (this.currentTest.state === 'failed') {
            try {
                const logs = await browser.getLogs('browser');
                console.log('--- BROWSER LOGS ---');
                logs.forEach(log => console.log(`[${log.level}] ${log.message}`));
                console.log('--------------------');
            } catch (e) {
                console.log('[Diagnostic] Failed to fetch browser logs');
            }
            const screenshotPath = `./tests/e2e/screenshots/failure-${Date.now()}.png`;
            await browser.saveScreenshot(screenshotPath);
            console.log(`[Diagnostic] Screenshot saved to ${screenshotPath}`);

            // Deep state check
            const state = await browser.execute(() => {
                // @ts-ignore
                const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
                const comp = view?.component;
                // @ts-ignore
                const isMobileApp = app.isMobile;
                return {
                    viewFound: !!view,
                    compFound: !!comp,
                    isMobileApp: isMobileApp,
                    isMobileNav: comp?.navState?.isMobile,
                    showingDetailedView: typeof comp?.isShowingDetailedView === 'function' ? comp.isShowingDetailedView() : comp?.showingDetailedView,
                    taskCount: comp?.navState?.tasks?.length,
                    activeCompName: comp?.activeComponent?.constructor?.name
                };
            });
            console.log('[Diagnostic] Deep State:', JSON.stringify(state, null, 2));
        }
    });

    it('should open DetailedView from Focus Mode title tap', async () => {
        await setupStackWithTasks(['Focus Task']);
        await $('.todo-flow-stack-container[data-ui-ready="true"]').waitForExist({ timeout: 5000 });

        // Mock app.isMobile and setIsMobile
        await browser.execute(() => {
            // @ts-ignore
            app.isMobile = true;
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            view?.component?.setIsMobile(true);
        });

        // Switch to Focus Mode
        await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            view?.component?.setViewMode('focus');
        });
        await $('.todo-flow-stack-container[data-view-mode="focus"]').waitForExist({ timeout: 5000 });

        await browser.pause(500);

        const title = await $('.focus-title');
        await title.waitForDisplayed({ timeout: 5000 });

        console.log('[Test] Clicking title via JS to ensure event firing...');
        await browser.execute(() => {
            const el = document.querySelector('.focus-title') as HTMLElement;
            el?.click();
        });

        // Verify state directly
        await browser.waitUntil(async () => {
            return await browser.execute(() => {
                // @ts-ignore
                const comp = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view?.component;
                return comp?.isShowingDetailedView?.() === true;
            });
        }, { timeout: 5000, timeoutMsg: 'showingDetailedView state did not become true' });

        const detailedContainer = await $('.vanilla-container');
        await detailedContainer.waitForExist({ timeout: 5000 });
        expect(await detailedContainer.isDisplayed()).toBe(true);

        // Close
        const backBtn = await $('.vanilla-back-btn');
        await backBtn.click();
        await detailedContainer.waitForExist({ reverse: true, timeout: 5000 });
    });

    it('should open DetailedView from Architect Mode via direct call', async () => {
        // Mock app.isMobile again (just in case of reload)
        await browser.execute(() => {
            // @ts-ignore
            app.isMobile = true;
        });

        // Switch to Architect Mode
        await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            view?.component?.setViewMode('architect');
        });
        await $('.todo-flow-stack-container[data-view-mode="architect"]').waitForExist({ timeout: 5000 });

        await browser.pause(500);

        // Open detailed view via component method
        await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            view?.component?.openDetailedView(0);
        });

        const detailedContainer = await $('.vanilla-container');
        await detailedContainer.waitForExist({ timeout: 5000 });
        expect(await detailedContainer.isDisplayed()).toBe(true);

        // Close
        const backBtn = await $('.vanilla-back-btn');
        await backBtn.click();
        await detailedContainer.waitForExist({ reverse: true, timeout: 5000 });
    });
});
