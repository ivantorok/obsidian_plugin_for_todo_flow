import { browser, expect, $ } from '@wdio/globals';
import fs from 'fs';
import path from 'path';

describe('Rollup Logic', () => {
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
        // 1. Setup fixtures FIRST so Obsidian sees them on boot
        await setupFixtures();

        // 2. Reload Obsidian
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });

        // @ts-ignore
        await browser.pause(5000); // Give it time to index

        // 3. Configure Plugin BEFORE waiting for links
        // @ts-ignore
        await browser.execute(() => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            if (plugin) {
                plugin.settings.debug = true;
                plugin.saveSettings();
            }
        });

        // 4. Wait for links with a more generous timeout and better debug logging
        await waitForLinks('j3_root.md', ['j3_gp.md']);
        await waitForLinks('j3_gp.md', ['j3_p.md']);
        await waitForLinks('j3_p.md', ['j3_ca.md', 'j3_cb.md']);
    });

    it('should update grandparent duration via rollup from deeply nested child', async () => {
        // 1. Activate root stack
        // @ts-ignore
        await browser.execute((filePath: string) => {
            // @ts-ignore
            const plugin = app.plugins.plugins['todo-flow'];
            plugin.activateStack(filePath);
        }, 'j3_root.md');

        const stackContainer = await $('.todo-flow-stack-container');
        await stackContainer.waitForDisplayed({ timeout: 10000 });


        await focusStack();

        // Initial Total: GP(30) + P(30) + CA(30) + CB(30) = 120
        // @ts-ignore
        let gpDuration = await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view;
            return view.getTasks()[0].duration;
        });
        console.log(`[Test] Initial grandparent duration: ${gpDuration}min`);
        expect(gpDuration).toBe(120);

        // 2. Drill down to parent
        // @ts-ignore
        await browser.keys(['Enter']);
        // @ts-ignore
        await browser.pause(1500);
        await focusStack();

        // 3. Drill down to children
        // @ts-ignore
        await browser.keys(['Enter']);
        // @ts-ignore
        await browser.pause(1500);
        await focusStack();

        // 4. Increase Child A's duration with 'f' (twice: 30 -> 45 -> 60)
        // @ts-ignore
        await browser.keys(['f']);
        // @ts-ignore
        await browser.pause(800);
        // @ts-ignore
        await browser.keys(['f']);
        // @ts-ignore
        await browser.pause(800);

        // @ts-ignore
        const newChildDuration = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view.getTasks()[0].duration;
        });
        console.log(`[Test] Child A duration after increase: ${newChildDuration}min`);
        expect(newChildDuration).toBe(60);

        // 5. Navigate back to root level (2x 'h')
        // @ts-ignore
        await browser.keys(['h']);
        // @ts-ignore
        await browser.pause(1500);
        await focusStack();
        // @ts-ignore
        await browser.keys(['h']);
        // @ts-ignore
        await browser.pause(1500);
        await focusStack();

        // 6. Get updated grandparent duration
        // GP(30) + P(30) + CA(60) + CB(30) = 150
        // @ts-ignore
        let finalGpDuration = await browser.execute(() => {
            // @ts-ignore
            return app.workspace.getLeavesOfType('todo-flow-stack-view')[0].view.getTasks()[0].duration;
        });
        console.log(`[Test] Grandparent duration after rollup: ${finalGpDuration}min`);

        expect(finalGpDuration).toBe(150);
        console.log('[Test] ✅ Rollup logic verified across 3 levels of file links!');
    });
});
