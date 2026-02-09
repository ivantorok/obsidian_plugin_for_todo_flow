import { browser, expect, $ } from '@wdio/globals';
import { setupStackWithTasks, focusStack } from '../e2e_utils.js';
import { cleanupVault } from '../test_utils.js';

describe('Desktop Shortcut Conflict (BUG-001)', () => {

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

    it('should prioritize Triage shortcuts over background Stack shortcuts', async () => {
        // 1. Setup a stack with 1 task
        console.log('[Test BUG-001] Step 1: Setting up initial stack');
        await setupStackWithTasks(['Initial Stack Task']);

        // 2. FORCE Open Triage view with dummy tasks to bypass empty Dump check
        console.log('[Test BUG-001] Step 2: Forcing Triage view open');
        await browser.execute(() => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            const dummyTasks = [{ id: 'dummy.md', title: 'Dummy Triage Task', status: 'todo' }];
            // @ts-ignore
            plugin.activateTriage(dummyTasks);
        });

        await browser.pause(2000); // Wait for Triage to open and become active

        // Manually ensure Triage has focus in Obsidian
        await browser.execute(() => {
            // @ts-ignore
            const triageLeaf = app.workspace.getLeavesOfType('todo-flow-triage-view')[0];
            if (triageLeaf) {
                // @ts-ignore
                app.workspace.setActiveLeaf(triageLeaf, { focus: true });
                // @ts-ignore
                triageLeaf.view.containerEl.focus();
            }
        });
        await browser.pause(1000);

        // DIAGNOSTIC HOOK: Get all leaf IDs and types
        const leafInfo = await browser.execute(() => {
            // @ts-ignore
            const activeLeaf = app.workspace.activeLeaf;
            // @ts-ignore
            const stackLeaf = app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
            // @ts-ignore
            const triageLeaf = app.workspace.getLeavesOfType('todo-flow-triage-view')[0];
            return {
                activeId: activeLeaf?.id,
                activeType: activeLeaf?.view?.getViewType(),
                stackId: stackLeaf?.id,
                triageId: triageLeaf?.id
            };
        });
        console.log('[Test BUG-001] Workspace State:', JSON.stringify(leafInfo, null, 2));

        // 3. Trigger Obsidian Command 'Add Task to Stack'
        console.log('[Test BUG-001] Step 3: Triggering "todo-flow:add-task-to-stack" command');

        await browser.execute(() => {
            // @ts-ignore
            const targetCommand = Object.keys(app.commands.commands).find(id => id.includes('add-task-to-stack'));
            if (targetCommand) {
                // @ts-ignore
                app.commands.executeCommandById(targetCommand);
            }
        });

        await browser.pause(2000);

        // Verify who handled the shortcut or which view is active
        const activeViewType = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.activeLeaf?.view?.getViewType();
        });

        console.log('[Test BUG-001] Active View Type after command:', activeViewType);

        // EXPECTATION: The Triage view should remain sovereign. 
        // CURRENT BUGGY BEHAVIOR: Output will be 'todo-flow-stack-view' because command reveals stack leaf.
        expect(activeViewType).toBe('todo-flow-triage-view');

        // 4. Enter a task title and submit
        console.log('[Test BUG-001] Step 4: Submitting task via Quick Add Modal');
        // @ts-ignore
        await browser.keys(['Triage-only Task', 'Enter']);
        await browser.pause(1000);

        // 5. Verify results
        const stackTasks = await browser.execute(() => {
            // @ts-ignore
            const stackLeaf = app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
            // @ts-ignore
            return stackLeaf.view.getTasks().map(t => t.title);
        });

        console.log('[Test BUG-001] Stack Tasks found:', stackTasks);

        // EXPECTATION: The stack should still only have the initial task.
        expect(stackTasks).not.toContain('Triage-only Task');
        expect(stackTasks.length).toBe(1);
    });
});
