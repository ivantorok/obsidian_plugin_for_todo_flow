import { browser, $ } from '@wdio/globals';

// Helper to ensure Stack View is focused
export async function focusStack() {
    // @ts-ignore
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
    // @ts-ignore
    await browser.pause(300);
}

// Helper function to create tasks via Dump → Triage → Stack flow
export async function setupStackWithTasks(taskNames: string[]) {
    // 1. Verify Plugin is actually loaded and enabled
    const pluginStatus = await browser.execute(() => {
        // @ts-ignore
        const plugins = app.plugins.enabledPlugins;
        const isEnabled = plugins.has('todo-flow');
        // @ts-ignore
        const pluginInstance = app.plugins.getPlugin('todo-flow');
        if (pluginInstance) {
            pluginInstance.settings.debug = true;
            pluginInstance.logger.setEnabled(true);
        }
        return {
            isEnabled,
            hasInstance: !!pluginInstance,
            allEnabled: Array.from(plugins)
        };
    });
    console.log('[Test Setup] Plugin Status:', JSON.stringify(pluginStatus));

    if (!pluginStatus.isEnabled) {
        throw new Error(`Plugin 'todo-flow' is not enabled! Enabled plugins: ${pluginStatus.allEnabled.join(', ')}`);
    }

    // 2. Clean up existing tasks to ensure fresh start
    // @ts-ignore
    await browser.execute(async () => {
        try {
            const folder = app.vault.getAbstractFileByPath('todo-flow');
            if (folder) {
                // @ts-ignore
                await app.vault.delete(folder, true);
                console.log('[Test Setup] Deleted existing todo-flow folder');
            }
            // Ensure logs folder is fresh too
            const logsFolder = app.vault.getAbstractFileByPath('logs');
            if (logsFolder) {
                // @ts-ignore
                await app.vault.delete(logsFolder, true);
            }
            // TEST WRITABILITY
            await app.vault.create('writability-test.txt', 'test content');
            const file = app.vault.getAbstractFileByPath('writability-test.txt');
            if (file) {
                console.log('[Test Setup] Vault is writable');
                await app.vault.delete(file);
            } else {
                console.error('[Test Setup] ERROR: Vault is NOT writable (file not found after create)');
            }
        } catch (e) {
            console.warn('Cleanup or Writability test failed:', e);
        }
    });

    // 3. Open Dump
    // @ts-ignore
    await browser.execute(() => app.commands.executeCommandById('todo-flow:open-todo-dump'));
    // @ts-ignore
    await browser.waitUntil(async () => {
        // @ts-ignore
        return await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-dump-view').length > 0;
        });
    }, { timeout: 5000 });

    const dumpInput = await $('textarea.todo-flow-dump-input');

    // Create tasks
    for (const taskName of taskNames) {
        console.log(`[Test Setup] Creating task: ${taskName}`);
        await dumpInput.setValue(taskName);
        // @ts-ignore
        await browser.keys(['Enter']);
        // @ts-ignore
        await browser.pause(500); // Increased pause for safety
    }

    // Trigger Triage
    console.log('[Test Setup] Submitting dump...');
    await dumpInput.setValue('done');
    // @ts-ignore
    await browser.keys(['Enter']);

    // Wait for Triage
    // @ts-ignore
    await browser.waitUntil(async () => {
        // @ts-ignore
        return await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-triage-view').length > 0;
        });
    }, { timeout: 5000 });

    // Focus Triage View to ensure keys work
    // @ts-ignore
    await browser.execute(() => {
        // @ts-ignore
        const leaf = app.workspace.getLeavesOfType('todo-flow-triage-view')[0];
        if (leaf) {
            // @ts-ignore
            app.workspace.setActiveLeaf(leaf, { focus: true });
        }
    });

    // Keep all tasks (k for each)
    for (let i = 0; i < taskNames.length; i++) {
        // @ts-ignore
        await browser.keys(['k']);
        // @ts-ignore
        await browser.pause(500);
    }

    // Wait for Stack
    // @ts-ignore
    await browser.waitUntil(async () => {
        // @ts-ignore
        return await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-stack-view').length > 0;
        });
    }, { timeout: 5000 });

    // @ts-ignore
    await browser.pause(500); // Let Stack settle
}
