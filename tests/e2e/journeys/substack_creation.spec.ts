import { browser, expect, $ } from '@wdio/globals';
import fs from 'fs';
import path from 'path';

describe('Subtask Creation Journey', () => {
    const vaultPath = path.resolve(process.cwd(), '.test-vault');

    async function setupFreshVault() {
        if (!fs.existsSync(vaultPath)) {
            fs.mkdirSync(vaultPath, { recursive: true });
        } else {
            // Clean up existing markdown files
            const files = fs.readdirSync(vaultPath);
            for (const file of files) {
                if (file.endsWith('.md')) {
                    fs.unlinkSync(path.join(vaultPath, file));
                }
            }
        }

        // Create a root with one task
        fs.writeFileSync(path.join(vaultPath, 'root.md'), '---\ntodo-flow-root: true\n---\n- [ ] [[parent|Parent Task]]');
        fs.writeFileSync(path.join(vaultPath, 'parent.md'), '# Parent Task\n\nNothing here yet.');
    }

    async function waitForStackReady() {
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            return await browser.execute(() => {
                // @ts-ignore
                const leaf = app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
                if (!leaf) return false;
                const view = leaf.view;
                return !!(view && view.component && view.getTasks().length > 0);
            });
        }, { timeout: 15000, timeoutMsg: 'Stack view component never became ready' });
    }

    beforeEach(async function () {
        await setupFreshVault();
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });

        // Enable debug
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            if (plugin) {
                plugin.settings.debug = true;
                plugin.saveSettings();
            }
        });
    });

    it('should create a subtask and update the parent indicator', async () => {
        try {
            // 1. Activate root stack
            // @ts-ignore
            await browser.execute((filePath: string) => {
                // @ts-ignore
                const plugin = app.plugins.plugins['todo-flow'];
                plugin.activateStack(filePath);
            }, 'root.md');

            await waitForStackReady();

            // 2. Force mobile mode for detailed view testing
            // @ts-ignore
            await browser.execute(() => {
                // @ts-ignore
                const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
                if (view && view.component) view.component.setIsMobile(true);
            });

            // 3. Open Detailed View for Parent Task
            // @ts-ignore
            await browser.execute(() => {
                // @ts-ignore
                const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
                if (view && view.component) view.component.openDetailedView(0);
            });

            // 4. Verify Detailed View is open
            const detailedView = await $('[data-testid="detailed-task-view"]');
            await detailedView.waitForExist({ timeout: 10000 });
            await expect(detailedView).toBePresent();

            // 5. Click "Add Subtask"
            const addSubtaskBtn = await $('[data-testid="add-subtask-btn"]');
            await addSubtaskBtn.waitForExist({ timeout: 10000 });
            await expect(addSubtaskBtn).toBePresent();
            await addSubtaskBtn.click();

            // 6. Fill and submit subtask title
            const inputWrapper = await $('[data-testid="subtask-input-wrapper"]');
            await inputWrapper.waitForExist({ timeout: 10000 });
            await expect(inputWrapper).toBePresent();

            const input = await inputWrapper.$('textarea');
            await input.setValue('Newly Created Child');

            // Submit via Enter
            await browser.keys('Enter');

            // 7. Close Detailed View
            const backBtn = await detailedView.$('.vanilla-back-btn');
            await backBtn.click();
            await expect(detailedView).not.toBePresent();

            // 8. Verify subtask indicator is now present on the parent card (count should be 1)
            await browser.waitUntil(async () => {
                const indicator = await $('.substack-indicator');
                if (!(await indicator.isExisting())) return false;
                const count = await indicator.$('.count').getText();
                return count === '1';
            }, { timeout: 15000, timeoutMsg: 'Subtask indicator did not update to 1' });

            // 9. Click indicator to verify the child exists in the sub-stack
            const indicator = await $('.substack-indicator');
            await indicator.click();

            await browser.waitUntil(async () => {
                return await browser.execute(() => {
                    // @ts-ignore
                    const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
                    return view?.getTasks().some((t: any) => t.title === 'Newly Created Child');
                });
            }, { timeout: 10000, timeoutMsg: 'New subtask not found in child stack' });
        } catch (e) {
            const debugLog = await browser.execute(() => (window as any)._tf_log || []);
            console.error('--- E2E DEBUG LOG ---');
            console.error(JSON.stringify(debugLog, null, 2));
            console.error('----------------------');
            throw e;
        }
    });
});
