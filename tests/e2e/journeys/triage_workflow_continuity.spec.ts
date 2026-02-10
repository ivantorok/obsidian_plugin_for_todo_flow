import { browser, expect, $ } from '@wdio/globals';
import { emulateMobile } from '../mobile_utils.js';
import { cleanupVault } from '../test_utils.js';

describe('Triage Workflow Continuity (BUG-019)', () => {

    before(async function () {
        try {
            // @ts-ignore
            await browser.reloadObsidian({ vault: './.test-vault' });
            await emulateMobile();

            // Configure Plugin
            await browser.execute(async () => {
                // @ts-ignore
                const plugin = app.plugins.plugins['todo-flow'];
                if (plugin) {
                    plugin.settings.targetFolder = 'todo-flow';
                    plugin.settings.swipeRightAction = 'shortlist'; // Ensure right swipe is Shortlist
                    plugin.settings.debug = true; // Enable FileLogger
                    if (plugin.logger && typeof plugin.logger.setEnabled === 'function') {
                        plugin.logger.setEnabled(true);
                    }
                    await plugin.saveSettings();
                } else {
                    await app.vault.adapter.write('debug_init_error.txt', 'Plugin todo-flow not found');
                }
            });
        } catch (e: any) {
            console.error('BEFORE HOOK ERROR:', e);
            // Try to write to FS if browser is alive?
        }
    });

    after(async function () {
        await cleanupVault();
    });

    it('should append shortlisted tasks to existing Daily Stack instead of overwriting', async () => {
        try {
            // 1. Setup: Create CurrentStack.md with one existing task
            await browser.execute(async () => {
                const adapter = app.vault.adapter;
                if (!(await adapter.exists('todo-flow'))) {
                    await adapter.mkdir('todo-flow');
                }

                // Force clean state
                if (await adapter.exists('todo-flow/CurrentStack.md')) {
                    await adapter.remove('todo-flow/CurrentStack.md');
                }

                // Create "OldTask" file
                if (!(await adapter.exists('todo-flow/OldTask.md'))) {
                    await app.vault.create('todo-flow/OldTask.md', '---\ntask: OldTask\nstatus: todo\n---');
                }

                // Create CurrentStack.md pointing to OldTask
                await app.vault.create('todo-flow/CurrentStack.md', '# Current Stack\n\n- [ ] [[todo-flow/OldTask.md]]\n');
            });

            // 2. Setup: Create a dump task to be triaged
            await browser.execute(async () => {
                const adapter = app.vault.adapter;
                if (!(await adapter.exists('NewTask.md'))) {
                    await app.vault.create('NewTask.md', '---\nflow_state: dump\n---\n# NewTask');
                }
            });

            // DIAGNOSTIC START: Verify vault state
            await browser.execute(async () => {
                const adapter = app.vault.adapter;
                const plugin = (app as any).plugins.plugins['todo-flow'];
                const diag = {
                    pluginFound: !!plugin,
                    targetFolder: plugin?.settings?.targetFolder,
                    currentStackExists: await adapter.exists('todo-flow/CurrentStack.md'),
                    oldTaskExists: await adapter.exists('todo-flow/OldTask.md'),
                    newTaskExists: await adapter.exists('NewTask.md')
                };
                await adapter.write('debug_setup_diag.txt', JSON.stringify(diag, null, 2));
            });

            await browser.pause(500);

            // 3. Start Triage
            await browser.execute(() => {
                app.commands.executeCommandById('todo-flow:start-triage');
            });

            // 4. Assert: Triage card should show "NewTask"
            console.log('[Test] Asserting triage card header...');
            const header = await $('.todo-flow-card-header');
            await expect(header).toHaveText('NEWTASK');

            // 5. Swipe Right (Shortlist) on "NewTask"
            console.log('[Test] Swiping right on NewTask...');
            const wrapper = await $('.triage-card-wrapper');
            // @ts-ignore
            await wrapper.dragAndDrop({ x: 200, y: 0 }); // Swipe right

            await browser.pause(1000); // Wait for debounce and conflict check

            // 6. Assert: Conflict Card should appear
            console.log('[Test] Verifying Conflict Card...');
            const conflictCard = await $('.triage-card-wrapper');
            await expect(conflictCard).toHaveText(expect.stringContaining('EXISTING STACK DETECTED'));

            // 7. Click "Merge" (Right Button)
            console.log('[Test] Clicking Merge...');
            const mergeBtn = await $('.control-btn.shortlist');
            console.log('[Test] Merge Button Text:', await mergeBtn.getText());
            await mergeBtn.click();

            await browser.pause(1000); // Wait for save

            // 8. Verify: NewTask appended to OldTask
            console.log('[Test] Verifying final stack content...');
            const stackContent = await browser.execute(async () => {
                const file = app.vault.getAbstractFileByPath('todo-flow/CurrentStack.md');
                if (!file) return null;
                return await app.vault.read(file);
            });

            console.log('Final Stack Content:', stackContent);
            expect(stackContent).toContain('OldTask');
            expect(stackContent).toContain('NewTask');

        } catch (e) {
            throw e;
        }
    });
});
