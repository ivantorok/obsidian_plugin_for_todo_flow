import { browser, $ } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

export async function scaffoldVault(fixtureName: string) {
    const vaultPath = path.resolve('./.test-vault');
    const fixturePath = path.resolve(`./tests/fixtures/${fixtureName}`);

    // 1. Wipe current test vault files (except .obsidian)
    if (fs.existsSync(vaultPath)) {
        const files = fs.readdirSync(vaultPath);
        for (const file of files) {
            if (file === '.obsidian') continue;
            fs.rmSync(path.join(vaultPath, file), { recursive: true, force: true });
        }
    } else {
        fs.mkdirSync(vaultPath, { recursive: true });
    }

    // 2. Copy fixture
    if (fs.existsSync(fixturePath)) {
        fs.cpSync(fixturePath, vaultPath, { recursive: true });
        console.log(`[Scaffold] Vault populated from ${fixtureName}`);
    } else {
        console.warn(`[Scaffold] Fixture ${fixtureName} not found!`);
    }

    // 3. Wait for Obsidian to index
    await browser.pause(1000);
}

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
    const pluginStatus = await (browser as any).execute(() => {
        // @ts-ignore
        const plugins = (window as any).app.plugins.enabledPlugins;
        const isEnabled = plugins.has('todo-flow');
        // @ts-ignore
        const pluginInstance = (window as any).app.plugins.getPlugin('todo-flow');
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
    await browser.execute(async () => {
        try {
            // @ts-ignore
            const rootFiles = app.vault.getMarkdownFiles();
            for (const file of rootFiles) {
                // @ts-ignore
                await app.vault.delete(file);
            }
            console.log(`[Test Setup] Deleted existing markdown files`);

            // @ts-ignore
            const folder = app.vault.getAbstractFileByPath('todo-flow');
            if (folder) {
                // @ts-ignore
                await app.vault.delete(folder, true);
                console.log('[Test Setup] Deleted existing todo-flow folder');
            }

            // Ensure logs folder is fresh too
            localStorage.removeItem('_todo_flow_debug_logs');
        } catch (e) {
            console.error('Cleanup or Writability test failed:', e);
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
        console.log(`[Test Setup] Shortlisting task ${i}: ${taskNames[i]}...`);
        // @ts-ignore
        await browser.keys(['k']);
        // @ts-ignore
        await browser.pause(800);
    }

    // Wait for Stack
    // @ts-ignore
    await browser.waitUntil(async () => {
        // @ts-ignore
        return (await browser.execute(() => app.workspace.getLeavesOfType('todo-flow-stack-view').length > 0));
    }, { timeout: 60000, timeoutMsg: 'todo-flow-stack-view did not appear in time (60s limit)' });

    // @ts-ignore
    await browser.pause(2000); // Increased settle pause for Obsidian indexing
}
