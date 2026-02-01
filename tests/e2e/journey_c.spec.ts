import { browser, expect, $ } from '@wdio/globals';
import fs from 'fs';
import path from 'path';

describe('Journey C: Deep Work & Rollups', () => {
    const vaultPath = path.resolve(process.cwd(), '.test-vault');
    const fixturesPath = path.resolve(process.cwd(), 'tests/fixtures/journey_c');

    // Helper to copy fixtures to vault
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

    // Helper to wait for Obsidian indexing
    async function waitForLinks(sourcePath: string, targetIds: string[]) {
        console.log(`[Test] Waiting for links in ${sourcePath}: ${targetIds.join(', ')}`);
        await browser.waitUntil(async () => {
            const result = await browser.execute((src, targets) => {
                // @ts-ignore
                const cache = app.metadataCache;
                const links = cache.resolvedLinks[src];
                if (!links) return { success: false, reason: 'Source file not in resolvedLinks' };

                const linkKeys = Object.keys(links);
                const missing = targets.filter(t => !linkKeys.some(k => k === t || k.endsWith(t)));

                if (missing.length === 0) return { success: true };
                return { success: false, reason: `Missing: ${missing.join(', ')}`, found: linkKeys };
            }, sourcePath, targetIds);

            if (result.success) return true;
            // Diagnostic logging
            // console.log(`[Test] ${sourcePath} status: ${result.reason}. Found: ${JSON.stringify(result.found)}`);
            return false;
        }, { timeout: 15000, timeoutMsg: `Links ${targetIds} not found in ${sourcePath} after 15s` });
    }

    // Helper to ensure Stack View is focused
    async function focusStack() {
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
    }

    beforeEach(async function () {
        await browser.reloadObsidian({ vault: './.test-vault' });
        await setupFixtures();

        // Let Obsidian start up and initialize cache
        await browser.pause(3000);

        // Wait for Obsidian to index the hierarchy
        await waitForLinks('j3_root.md', ['j3_gp.md']);
        await waitForLinks('j3_gp.md', ['j3_p.md']);
        await waitForLinks('j3_p.md', ['j3_ca.md', 'j3_cb.md']);

        // Enable debug logging for the test
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
        await browser.execute((filePath) => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            plugin.activateStack(filePath);
        }, 'j3_root.md');

        const stackContainer = await $('.todo-flow-stack-container');
        await stackContainer.waitForDisplayed({ timeout: 5000 });
        await focusStack();

        // Level 0: Should see Grandparent Task
        let titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks().map(t => t.title);
        });
        expect(titles).toContain('Grandparent Task');

        // 2. Drill down to parent (Level 1)
        await browser.keys(['Enter']);
        await browser.pause(1000);
        await focusStack();

        titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks().map(t => t.title);
        });
        expect(titles).toContain('Parent Task');

        // 3. Drill down again to children (Level 2)
        await browser.keys(['Enter']);
        await browser.pause(1000);
        await focusStack();

        titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks().map(t => t.title);
        });
        expect(titles).toContain('Child A');
        expect(titles).toContain('Child B');

        // 4. Navigate back one level with 'h'
        await browser.keys(['h']);
        await browser.pause(1000);
        await focusStack();

        titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks().map(t => t.title);
        });
        expect(titles).toContain('Parent Task');

        // 5. Navigate back to grandparent with another 'h'
        await browser.keys(['h']);
        await browser.pause(1000);
        await focusStack();

        titles = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks().map(t => t.title);
        });
        expect(titles).toContain('Grandparent Task');
        console.log('[Test] ✅ Multi-level drill-down works!');
    });

    it('should update grandparent duration via rollup from deeply nested child', async () => {
        // 1. Activate root stack
        await browser.execute((filePath) => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            plugin.activateStack(filePath);
        }, 'j3_root.md');

        const stackContainer = await $('.todo-flow-stack-container');
        await stackContainer.waitForDisplayed({ timeout: 10000 });
        await focusStack();

        // Initial Total: GP(30) + P(30) + CA(30) + CB(30) = 120
        let gpDuration = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view.getTasks()[0].duration;
        });
        console.log(`[Test] Initial grandparent duration: ${gpDuration}min`);
        expect(gpDuration).toBe(120);

        // 2. Drill down to parent
        await browser.keys(['Enter']);
        await browser.pause(1500);
        await focusStack();

        // 3. Drill down to children
        await browser.keys(['Enter']);
        await browser.pause(1500);
        await focusStack();

        // 4. Increase Child A's duration with 'f' (twice: 30 -> 45 -> 60)
        await browser.keys(['f']);
        await browser.pause(800);
        await browser.keys(['f']);
        await browser.pause(800);

        const newChildDuration = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view.getTasks()[0].duration;
        });
        console.log(`[Test] Child A duration after increase: ${newChildDuration}min`);
        expect(newChildDuration).toBe(60);

        // 5. Navigate back to root level (2x 'h')
        await browser.keys(['h']);
        await browser.pause(1500);
        await focusStack();
        await browser.keys(['h']);
        await browser.pause(1500);
        await focusStack();

        // 6. Get updated grandparent duration
        // GP(30) + P(30) + CA(60) + CB(30) = 150
        let finalGpDuration = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view.getTasks()[0].duration;
        });
        console.log(`[Test] Grandparent duration after rollup: ${finalGpDuration}min`);

        expect(finalGpDuration).toBe(150);
        console.log('[Test] ✅ Rollup logic verified across 3 levels of file links!');
    });

    it('should NOT open leaf file with Enter (only Shift+Enter should open)', async () => {
        // 1. Activate parent stack
        await browser.execute((filePath) => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            plugin.activateStack(filePath);
        }, 'j3_p.md');

        const stackContainer = await $('.todo-flow-stack-container');
        await stackContainer.waitForDisplayed({ timeout: 5000 });
        await focusStack();

        // 2. Press Enter on Child A (leaf)
        await browser.keys(['Enter']);
        await browser.pause(1000);

        // 3. Verify active file is STILL NOT Child A (should stay on whatever was active or none)
        const activeFile = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getActiveFile()?.path;
        });
        expect(activeFile).not.toBe('j3_ca.md');
        console.log('[Test] ✅ Enter on leaf did NOT open file (Focus safe!)');

        // 4. Now press Shift+Enter to confirm it STILL works when intended
        await focusStack();
        await browser.keys(['Shift', 'Enter']);
        await browser.pause(1000);

        const newActiveFile = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getActiveFile()?.path;
        });
        expect(newActiveFile).toBe('j3_ca.md');
        console.log('[Test] ✅ Shift+Enter still opens file as expected');

        // Cleanup
        await browser.execute(() => {
            // @ts-ignore
            if (app.workspace.activeLeaf) app.workspace.activeLeaf.detach();
        });
        await browser.pause(500);
    });

    it('should open leaf file with Shift+Enter (FORCE_OPEN)', async () => {
        // 1. Activate parent stack
        await browser.execute((filePath) => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            plugin.activateStack(filePath);
        }, 'j3_p.md');

        const stackContainer = await $('.todo-flow-stack-container');
        await stackContainer.waitForDisplayed({ timeout: 5000 });
        await focusStack();

        // 2. Press Shift+Enter on Child A (leaf)
        // Ensure focus is on the first item
        await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            if (view && view.component) view.component.setFocus(0);
        });
        await browser.pause(200);

        await browser.keys(['Shift', 'Enter']);
        await browser.pause(1500);

        // 3. Verify active file is Child A
        const activeFile = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getActiveFile()?.path;
        });
        expect(activeFile).toBe('j3_ca.md');
        console.log('[Test] ✅ Shift+Enter opened leaf file as expected');

        // Cleanup: Close the editor to avoid focus issues in next tests
        await browser.execute(() => {
            // @ts-ignore
            if (app.workspace.activeLeaf) app.workspace.activeLeaf.detach();
        });
        await browser.pause(500);
    });
});
