import { browser, expect, $, $$ } from '@wdio/globals';
import { emulateMobile, resetToDesktop } from './mobile_utils.js';
import { setupStackWithTasks, focusStack } from './e2e_utils.js';
import * as path from 'path';
import * as fs from 'fs';

async function capture(name: string) {
    const dir = path.resolve('./tests/e2e/screenshots/verification');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const screenshotPath = path.join(dir, `${name}.png`);
    await browser.saveScreenshot(screenshotPath);
    console.log(`[VISUAL] Captured: ${screenshotPath}`);
}

describe('Visual Verification: Sovereign UX Audit', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    it('should capture Mobile Architect (List View)', async () => {
        await setupStackWithTasks(['Task 1', 'Task 2', 'Task 3']);
        await emulateMobile();
        await focusStack();

        // Force Architect Mode (List View)
        await browser.execute(() => {
            // @ts-ignore
            const leaves = app.workspace.getLeavesOfType('todo-flow-stack-view');
            if (leaves.length > 0 && leaves[0].view.component) {
                leaves[0].view.component.setViewMode('architect');
            }
        });

        await browser.pause(2000); // Wait for animations
        await capture('mobile_architect_list');
    });

    it('should capture Mobile Focus (Single Task)', async () => {
        // Force Focus Mode
        await browser.execute(() => {
            // @ts-ignore
            const leaves = app.workspace.getLeavesOfType('todo-flow-stack-view');
            if (leaves.length > 0 && leaves[0].view.component) {
                leaves[0].view.component.setViewMode('focus');
            }
        });
        await browser.pause(1000);
        await capture('mobile_focus_mode');
    });

    it('should capture Desktop Architect View', async () => {
        await resetToDesktop();
        await browser.execute(() => {
            // @ts-ignore
            const leaves = app.workspace.getLeavesOfType('todo-flow-stack-view');
            if (leaves.length > 0 && leaves[0].view.component) {
                leaves[0].view.component.setViewMode('architect');
            }
        });
        await browser.pause(1000);
        await capture('desktop_architect_view');
    });

    it.skip('should capture Triage View', async () => {
        // Mock a triage session by creating orphan tasks and opening triage
        await browser.execute(async () => {
            // @ts-ignore
            const plugin = app.plugins.getPlugin('todo-flow');
            // @ts-ignore
            await app.vault.create('Orphan Task.md', 'status: todo');
            // @ts-ignore
            app.commands.executeCommandById('todo-flow:open-triage');
        });

        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => app.workspace.getLeavesOfType('todo-flow-triage-view').length > 0);
        }, { timeout: 5000 });

        await browser.pause(2000);
        await capture('triage_view_active');
    });
});
