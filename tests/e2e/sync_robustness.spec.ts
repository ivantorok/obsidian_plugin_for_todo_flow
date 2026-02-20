
import { browser, expect } from '@wdio/globals';

describe('Sync Robustness: CurrentStack.md External Modifications', () => {

    it('should refresh the UI when CurrentStack.md is modified externally', async () => {
        // 1. Setup: Create stack with 2 tasks
        await browser.execute(async () => {
            const tasks = [
                { id: "Task A", title: "Task A", duration: 10 },
                { id: "Task B", title: "Task B", duration: 20 }
            ];
            // Use the plugin's internal method to ensure clean state
            const plugin = (window as any).app.plugins.plugins['todo-flow'];
            if (plugin && plugin.stackPersistenceService) {
                // Ensure settings are initialized for test environment
                if (!plugin.settings.targetFolder) {
                    plugin.settings.targetFolder = 'todo-flow';
                }

                // Explicitly create task files to ensure links resolve (with safety checks)
                try {
                    const vault = (window as any).app.vault;
                    if (!(await vault.adapter.exists('Task A.md'))) {
                        await vault.create('Task A.md', '- [ ] Task A');
                    }
                    if (!(await vault.adapter.exists('Task B.md'))) {
                        await vault.create('Task B.md', '- [ ] Task B');
                    }
                } catch (e: any) {
                    console.error('TEST SETUP ERROR: Failed to create task files', e);
                }

                console.log('TEST: File creation check complete.');

                const targetPath = `${plugin.settings.targetFolder}/CurrentStack.md`;
                (window as any)._testTargetPath = targetPath; // Store globally
                console.log('TEST: Saving stack via persistence service...');
                await plugin.stackPersistenceService.saveStack(tasks, targetPath);
                console.log('TEST: Stack saved.');

                // Allow time for file write and cache update
                await new Promise(r => setTimeout(r, 2000));

                // Verify file exists
                const exists = await (window as any).app.vault.adapter.exists(targetPath);
                if (!exists) throw new Error(`Failed to create ${targetPath}`);
                return targetPath;
            }
        });

        const targetPath = await browser.execute(() => (window as any)._testTargetPath);
        console.log('DEBUG: Target Path:', targetPath);

        // Verify file content confirms what we wrote
        const content = await browser.execute(async (path) => {
            return await (window as any).app.vault.adapter.read(path);
        }, targetPath);
        console.log('DEBUG: File Content:', content);

        console.log('TEST: Opening Stack View...');
        // 2. Open Stack View explicitly with correct state (StackView needs rootPath)
        await browser.execute(async (path) => {
            const app = (window as any).app;
            console.log('TEST: Calling setViewState...');
            await app.workspace.getLeaf(true).setViewState({
                type: 'todo-flow-stack-view',
                active: true,
                state: { rootPath: path }
            });
            console.log('TEST: setViewState returned.');
        }, targetPath);

        // Wait for view to mount
        console.log('TEST: Waiting for view mount...');
        await browser.pause(2000);
        console.log('TEST: Checking for task cards...');

        const taskA = await $('.todo-flow-task-card*=Task A');
        const exists = await taskA.isExisting();
        console.log(`TEST: Task A exists? ${exists}`);

        if (!exists) {
            const debugInfo = await browser.execute(async (path) => {
                const app = (window as any).app;
                const files = app.vault.getFiles().map((f: any) => f.path).join(', ');
                const content = await app.vault.adapter.read(path).catch((e: any) => `READ ERROR: ${e.message}`);
                const body = document.body.innerHTML.substring(0, 500); // truncated body
                const text = `Vault Files: [${files}]\nTarget Class Content: ${content}\nBody Start: ${body}`;

                // Write using vault adapter to avoid Node 'fs' permission prompts
                // Note: user prefers project root/local files over /tmp
                try {
                    await app.vault.adapter.write('debug_probe.txt', text);
                } catch (e: any) {
                    console.error('Failed to write debug probe using adapter:', e);
                }
                return text;
            }, targetPath);

            throw new Error(`DEBUG PROBE FAILURE (See debug_probe.txt in test vault root)`);
        }

        await expect(taskA).toExist();
        const taskB = await $('.todo-flow-task-card*=Task B');
        await expect(taskB).toExist();

        // 3. External Modification: Overwrite CurrentStack.md with only 1 task
        // Simulating Obsidian Sync pulling a new version
        await browser.execute(async () => {
            const newContent = `---
startTime: ${new Date().toISOString()}
---
- [ ] 10m Task A`;

            await (window as any).app.vault.adapter.write('todo-flow/CurrentStack.md', newContent);
        });

        // 4. Wait for Watcher to trigger reload
        // This is the race condition area: Does the plugin see the change?
        await browser.pause(2000);

        // 5. Verify UI reflects the change (Task B should be gone)
        // BUG-009 Assertion: This is expected to FAIL if the bug exists
        const tasks = await $$('.todo-flow-task-card');
        await expect(tasks.length).toBe(1);
        await expect(taskB).not.toExist();

        // 6. Persistence Check: Perform an action (toggle done) and verify file
        // If stale state persisted, Task B will reappear in the file.
        const checkbox = await taskA.$('.todo-flow-checkbox, .focus-action-btn.complete, button.title');
        // Note: Using title click or strict selector depending on view mode. 
        // For standard view, let's just use the title to toggle or open.
        // Actually, let's just wait. If we edit, we might trigger the overwrite.

        // Let's force a save via internal method to mimic "auto-save on change"
        // Or better, interact with the UI.
        await taskA.click(); // Focus it
        await browser.keys(['Enter']); // Toggle complete (if focused) or just change focus.

        await browser.pause(1000);

        // Read file content
        const fileContent = await browser.execute(async () => {
            return await (window as any).app.vault.adapter.read('todo-flow/CurrentStack.md');
        });

        // If bug exists, Task B might be back in the file content
        expect(fileContent).not.toContain('Task B');
    });
});
