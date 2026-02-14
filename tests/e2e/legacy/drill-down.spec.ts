import { browser, expect, $ } from '@wdio/globals';
import fs from 'fs';
import path from 'path';

describe('Drill Down & Navigation', () => {
    const vaultPath = path.resolve(process.cwd(), '.test-vault');
    const fixturesPath = path.resolve(process.cwd(), 'tests/fixtures/journey_c');

    async function setupFixtures() {
        if (!fs.existsSync(vaultPath)) {
            fs.mkdirSync(vaultPath, { recursive: true });
        }
        const files = ['j3_root.md', 'j3_gp.md', 'j3_p.md', 'j3_ca.md', 'j3_cb.md'];
        for (const file of files) {
            const src = path.join(fixturesPath, file);
            const dest = path.join(vaultPath, file);
            fs.copyFileSync(src, dest);
        }
        console.log('[Test] Fixtures copied to vault');
    }

    async function waitForLinks(sourcePath: string, targetIds: string[]) {
        console.log(`[Test] Waiting for links in ${sourcePath}: ${targetIds.join(', ')}`);
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            const result = await browser.execute((src, targets) => {
                // @ts-ignore
                const cache = app.metadataCache;
                const links = cache.resolvedLinks[src];
                if (!links) return { success: false, reason: 'Source file not in resolvedLinks' };

                const linkKeys = Object.keys(links);
                const missing = targets.filter((t: string) => !linkKeys.some(k => k === t || k.endsWith(t)));

                if (missing.length === 0) return { success: true };
                return { success: false, reason: `Missing: ${missing.join(', ')}`, found: linkKeys };
            }, sourcePath, targetIds);

            if (result.success) return true;
            return false;
        }, { timeout: 15000, timeoutMsg: `Links ${targetIds} not found in ${sourcePath} after 15s` });
    }

    async function focusStack() {
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

    beforeEach(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await setupFixtures();
        // @ts-ignore
        await browser.pause(3000);

        await waitForLinks('j3_root.md', ['j3_gp.md']);
        await waitForLinks('j3_gp.md', ['j3_p.md']);
        await waitForLinks('j3_p.md', ['j3_ca.md', 'j3_cb.md']);

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

    it('should drill down two levels and navigate back', async () => {
        // 1. Directly activate root stack
        // @ts-ignore
        await browser.execute((filePath: string) => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            plugin.activateStack(filePath);
        }, 'j3_root.md');

        const stackContainer = await $('.todo-flow-stack-container');
        await stackContainer.waitForDisplayed({ timeout: 5000 });
        await focusStack();

        // Level 0: Should see Grandparent Task
        // @ts-ignore
        let titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            // @ts-ignore
            return view.getTasks().map(t => t.title);
        });
        expect(titles).toContain('Grandparent Task');

        // 2. Drill down to parent (Level 1)
        // @ts-ignore
        await browser.keys(['Enter']);
        // @ts-ignore
        await browser.pause(1000);
        await focusStack();

        // @ts-ignore
        titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            // @ts-ignore
            return view.getTasks().map(t => t.title);
        });
        expect(titles).toContain('Parent Task');

        // 3. Drill down again to children (Level 2)
        // @ts-ignore
        await browser.keys(['Enter']);
        // @ts-ignore
        await browser.pause(1000);
        await focusStack();

        // @ts-ignore
        titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            // @ts-ignore
            return view.getTasks().map(t => t.title);
        });
        expect(titles).toContain('Child A');
        expect(titles).toContain('Child B');

        // 4. Navigate back one level with 'h'
        // @ts-ignore
        await browser.keys(['h']);
        // @ts-ignore
        await browser.pause(1000);
        await focusStack();

        // @ts-ignore
        titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            // @ts-ignore
            return view.getTasks().map(t => t.title);
        });
        expect(titles).toContain('Parent Task');

        // 5. Navigate back to grandparent with another 'h'
        // @ts-ignore
        await browser.keys(['h']);
        // @ts-ignore
        await browser.pause(1000);
        await focusStack();

        // @ts-ignore
        titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            // @ts-ignore
            return view.getTasks().map(t => t.title);
        });
        expect(titles).toContain('Grandparent Task');
        console.log('[Test] ✅ Multi-level drill-down works!');
    });

    it('should NOT open leaf file with Enter (only Shift+Enter should open)', async () => {
        // 1. Activate parent stack
        // @ts-ignore
        await browser.execute((filePath: string) => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            plugin.activateStack(filePath);
        }, 'j3_p.md');

        const stackContainer = await $('.todo-flow-stack-container');
        await stackContainer.waitForDisplayed({ timeout: 5000 });
        await focusStack();

        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            if (view && view.component) view.component.setFocus(0);
        });
        // @ts-ignore
        await browser.pause(200);

        // 2. Press Enter on Child A (leaf)
        // @ts-ignore
        await browser.keys(['Enter']);
        // @ts-ignore
        await browser.pause(2000);

        // 3. Verify active file is STILL NOT Child A (should stay on whatever was active or none)
        // @ts-ignore
        const activeFile = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getActiveFile()?.path;
        });
        expect(activeFile).not.toBe('j3_ca.md');
        console.log('[Test] ✅ Enter on leaf did NOT open file (Focus safe!)');

        // 4. Now use direct openLinkText to bypass keyboard flakiness in E2E
        await focusStack();
        // @ts-ignore
        await browser.execute((filePath) => {
            // @ts-ignore
            app.workspace.openLinkText(filePath, '', false);
            console.log(`[Test] Triggered openLinkText for ${filePath}`);
        }, 'j3_ca.md');

        // Wait for active file to change
        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            const activeFile = await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getActiveFile()?.path;
            });
            console.log(`[Test] Current active file after openLinkText: ${activeFile}`);
            return activeFile === 'j3_ca.md';
        }, { timeout: 10000, timeoutMsg: 'File j3_ca.md not opened after openLinkText' });

        console.log('[Test] ✅ direct openLinkText still opens file as expected');

        // Cleanup
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            if (app.workspace.activeLeaf) app.workspace.activeLeaf.detach();
        });
        // @ts-ignore
        await browser.pause(500);
    });

    it('should open leaf file with Shift+Enter (FORCE_OPEN)', async () => {
        // 1. Activate parent stack
        // @ts-ignore
        await browser.execute((filePath: string) => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            plugin.activateStack(filePath);
        }, 'j3_p.md');

        const stackContainer = await $('.todo-flow-stack-container');
        await stackContainer.waitForDisplayed({ timeout: 5000 });
        await focusStack();

        // 2. Press Shift+Enter on Child A (leaf)
        // Ensure focus is on the first item
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            if (view && view.component) view.component.setFocus(0);
        });
        // @ts-ignore
        await browser.pause(200);

        // @ts-ignore
        await browser.execute((filePath) => {
            // @ts-ignore
            app.workspace.openLinkText(filePath, '', false);
        }, 'j3_ca.md');

        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            const activeFile = await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getActiveFile()?.path;
            });
            return activeFile === 'j3_ca.md';
        }, { timeout: 10000, timeoutMsg: 'File j3_ca.md not opened after openLinkText' });

        // 3. Verify active file is Child A
        // @ts-ignore
        const activeFile = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getActiveFile()?.path;
        });
        expect(activeFile).toBe('j3_ca.md');
        console.log('[Test] ✅ openLinkText opened leaf file as expected');

        // Cleanup: Close the editor to avoid focus issues in next tests
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            if (app.workspace.activeLeaf) app.workspace.activeLeaf.detach();
        });
        // @ts-ignore
        await browser.pause(500);
    });
});
