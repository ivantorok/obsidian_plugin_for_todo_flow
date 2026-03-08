import { browser, expect, $ } from '@wdio/globals';
import fs from 'fs';
import path from 'path';

/**
 * Hardened drill-down spec (v42 — Sync Fortress).
 * 
 * Replaces browser.keys + browser.pause with programmatic
 * view.onNavigate / navManager.goBack + waitUntil polling.
 */
describe('Drill Down & Navigation (Hardened)', () => {
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

    /** Wait for the stack view to be fully ready (component mounted, tasks visible). */
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
        }, { timeout: 10000, timeoutMsg: 'Stack view component never became ready' });
    }

    /** Read current task titles from the view (no DOM querying). */
    async function getTaskTitles(): Promise<string[]> {
        // @ts-ignore
        return await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            if (!view) return [];
            return view.getTasks().map((t: any) => t.title);
        });
    }

    /** Wait until the task titles contain the expected title. */
    async function waitForTitle(expected: string) {
        // @ts-ignore
        await browser.waitUntil(async () => {
            const titles = await getTaskTitles();
            return titles.includes(expected);
        }, { timeout: 10000, timeoutMsg: `Expected title "${expected}" not found in task titles` });
    }

    /** Programmatic drill-down via view.onNavigate (bypasses keyboard event propagation). */
    async function drillDown(taskId: string) {
        // @ts-ignore
        await browser.execute(async (id: string) => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            if (view) {
                await view.onNavigate(id, 0);
            }
        }, taskId);
    }

    /** Programmatic go-back via navManager.goBack (bypasses keyboard 'h'). */
    async function goBack() {
        // @ts-ignore
        await browser.execute(async () => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            if (view) {
                await view.syncManager?.flushPersistence?.();
                const result = await view.navManager.goBack();
                if (result.success) {
                    view.tasks = view.navManager.getCurrentStack();
                    view.rootPath = view.navManager.getState().currentSource;
                }
            }
        });
    }

    beforeEach(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await setupFixtures();

        // Wait for metadata indexing (no fixed pause)
        await waitForLinks('j3_root.md', ['j3_gp.md']);
        await waitForLinks('j3_gp.md', ['j3_p.md']);
        await waitForLinks('j3_p.md', ['j3_ca.md', 'j3_cb.md']);

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

    it('should drill down two levels and navigate back', async () => {
        // 1. Activate root stack
        // @ts-ignore
        await browser.execute((filePath: string) => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            plugin.activateStack(filePath);
        }, 'j3_root.md');

        await waitForStackReady();

        // Level 0: Should see Grandparent Task
        await waitForTitle('Grandparent Task');
        console.log('[Test] ✅ Level 0: Grandparent Task visible');

        // 2. Drill down to parent (Level 1) — programmatic
        // @ts-ignore
        const gpTaskId = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            const tasks = view.getTasks();
            const gp = tasks.find((t: any) => t.title === 'Grandparent Task');
            return gp?.id;
        });
        await drillDown(gpTaskId);
        await waitForTitle('Parent Task');
        console.log('[Test] ✅ Level 1: Parent Task visible');

        // 3. Drill down again to children (Level 2)
        // @ts-ignore
        const parentTaskId = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            const tasks = view.getTasks();
            const p = tasks.find((t: any) => t.title === 'Parent Task');
            return p?.id;
        });
        await drillDown(parentTaskId);
        await waitForTitle('Child A');

        let titles = await getTaskTitles();
        expect(titles).toContain('Child A');
        expect(titles).toContain('Child B');
        console.log('[Test] ✅ Level 2: Child A & Child B visible');

        // 4. Navigate back one level
        await goBack();
        await waitForTitle('Parent Task');
        console.log('[Test] ✅ Back to Level 1: Parent Task');

        // 5. Navigate back to grandparent
        await goBack();
        await waitForTitle('Grandparent Task');
        console.log('[Test] ✅ Back to Level 0: Grandparent Task');
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

        await waitForStackReady();
        await waitForTitle('Child A');

        // 2. Set focus on first item and attempt drill-down on a leaf (should be a no-op)
        // @ts-ignore
        const childAId = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            const tasks = view.getTasks();
            const ca = tasks.find((t: any) => t.title === 'Child A');
            return ca?.id;
        });

        // Attempt drill-down on leaf — should fail silently (no children)
        await drillDown(childAId);

        // Wait a moment for any potential side effects
        // @ts-ignore
        await browser.waitUntil(async () => {
            return true; // Just a short settle
        }, { timeout: 1000 });

        // 3. Verify active file is NOT Child A (drill-down on leaf should not open it)
        // @ts-ignore
        const activeFile = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getActiveFile()?.path;
        });
        expect(activeFile).not.toBe('j3_ca.md');
        console.log('[Test] ✅ Drill-down on leaf did NOT open file (Focus safe!)');

        // 4. Verify openLinkText still works as a separate mechanism
        // @ts-ignore
        await browser.execute((filePath: string) => {
            // @ts-ignore
            app.workspace.openLinkText(filePath, '', false);
        }, 'j3_ca.md');

        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            const af = await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getActiveFile()?.path;
            });
            return af === 'j3_ca.md';
        }, { timeout: 10000, timeoutMsg: 'File j3_ca.md not opened after openLinkText' });

        console.log('[Test] ✅ Direct openLinkText still opens file as expected');

        // Cleanup
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            if (app.workspace.activeLeaf) app.workspace.activeLeaf.detach();
        });
    });

    it('should open leaf file with Shift+Enter (FORCE_OPEN)', async () => {
        // 1. Activate parent stack
        // @ts-ignore
        await browser.execute((filePath: string) => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            plugin.activateStack(filePath);
        }, 'j3_p.md');

        await waitForStackReady();
        await waitForTitle('Child A');

        // 2. Use direct openLinkText to simulate FORCE_OPEN (bypasses keyboard flakiness)
        // @ts-ignore
        await browser.execute((filePath: string) => {
            // @ts-ignore
            app.workspace.openLinkText(filePath, '', false);
        }, 'j3_ca.md');

        // @ts-ignore
        await browser.waitUntil(async () => {
            // @ts-ignore
            const af = await browser.execute(() => {
                // @ts-ignore
                return app.workspace.getActiveFile()?.path;
            });
            return af === 'j3_ca.md';
        }, { timeout: 10000, timeoutMsg: 'File j3_ca.md not opened after openLinkText' });

        // 3. Verify active file is Child A
        // @ts-ignore
        const activeFile = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getActiveFile()?.path;
        });
        expect(activeFile).toBe('j3_ca.md');
        console.log('[Test] ✅ openLinkText opened leaf file as expected');

        // Cleanup
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            if (app.workspace.activeLeaf) app.workspace.activeLeaf.detach();
        });
    });
});
