import { browser, expect } from '@wdio/globals';
import { setupStackWithTasks, focusStack } from '../e2e_utils.js';
import { emulateMobile } from '../mobile_utils.js';
import { cleanupVault } from '../test_utils.js';

describe('Mobile Stack Layout Refinements (FEAT-002)', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
    });

    after(async function () {
        await cleanupVault();
    });

    it('should apply mobile layout refinements', async () => {
        // 1. Setup tasks (some anchored, some not)
        await setupStackWithTasks([
            'Task 1: This is a very long title that should definitely wrap across multiple lines on a mobile device and eventually be clamped to two lines as per the requirements.',
            'Task 2: Anchored Task'
        ]);

        // Anchor Task 2
        await browser.execute(() => {
            // @ts-ignore
            const leaf = app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
            const view = leaf?.view as any;
            if (view && view.getController()) {
                view.getController().toggleAnchor(1);
            }
        });

        await emulateMobile();

        // Wait for UI Ready signal
        await $('.todo-flow-stack-container[data-ui-ready="true"]').waitForExist({ timeout: 5000 });

        // Wait for tasks to be projected (2 tasks expected: Task 1 and Task 2)
        await $('.todo-flow-stack-container[data-task-count="2"]').waitForExist({ timeout: 10000 });

        // Wait for cards to appear and click first task to ensure focus
        const mobileCard0 = await $('[data-testid="task-card-0"]');
        await mobileCard0.waitForExist({ timeout: 10000 });
        await mobileCard0.click();

        await focusStack();

        // Explicitly refresh mobile detection in StackView
        await browser.execute(() => {
            // @ts-ignore
            const view = app.workspace.getLeavesOfType('todo-flow-stack-view')[0]?.view;
            if (view?.refreshMobileDetection) {
                view.refreshMobileDetection();
            }
        });

        await browser.pause(200); // Allow mobile state to apply

        // Wait for Mobile signal
        const container = await $('.todo-flow-stack-container[data-is-mobile="true"]');
        await container.waitForExist({ timeout: 5000 });

        // 1.5 Debug: Check classes on container
        const debugResult = await browser.execute(() => {
            const container = document.querySelector('.todo-flow-stack-container');
            return {
                classList: container ? Array.from(container.classList) : [],
                appIsMobile: (window as any).app?.isMobile,
                innerWidth: window.innerWidth,
                bodyHasClass: document.body.classList.contains('is-mobile')
            };
        });
        console.log('[Test FEAT-002] Container Debug:', debugResult);

        // 2. Verify Title Clamping (2 lines)
        await browser.waitUntil(async () => {
            const res = await browser.execute(() => {
                const title = document.querySelector('[data-testid="task-card-title"]') as HTMLElement;
                if (!title) return false;
                const style = window.getComputedStyle(title);
                return style.webkitLineClamp === '2' || (style as any).webkitLineClamp == 2;
            });
            return res === true;
        }, { timeout: 10000, timeoutMsg: 'Title clamping not applied in time' });

        const clampingResult = await browser.execute(() => {
            const title = document.querySelector('[data-testid="task-card-title"]') as HTMLElement;
            if (!title) return { found: false };
            const style = window.getComputedStyle(title);

            // Log hierarchy for debugging
            let hierarchy = [];
            let curr = title as HTMLElement | null;
            while (curr) {
                hierarchy.push({
                    tag: curr.tagName.toLowerCase(),
                    classes: Array.from(curr.classList),
                    style: curr.getAttribute('style')
                });
                curr = curr.parentElement;
            }

            return {
                found: true,
                lineClamp: style.webkitLineClamp,
                display: style.display,
                boxOrient: style.webkitBoxOrient,
                overflow: style.overflow,
                hierarchy
            };
        });
        console.log('[Test FEAT-002] Clamping Style Detail:', JSON.stringify(clampingResult, null, 2));
        expect(clampingResult.found).toBe(true);
        expect(clampingResult.lineClamp).toBe('2');

        // 3. Verify Date is Hidden and Time is visible
        const timeResult = await browser.execute(() => {
            const mobileTime = document.querySelector('.mobile-only-time');
            const desktopTime = document.querySelector('.desktop-only-time');
            return {
                mobileVisible: mobileTime && window.getComputedStyle(mobileTime).display !== 'none',
                desktopHidden: desktopTime && window.getComputedStyle(desktopTime).display === 'none'
            };
        });
        expect(timeResult.mobileVisible).toBe(true);
        expect(timeResult.desktopHidden).toBe(true);

        // 4. Verify Conditional Edit Button (Pencil icon)
        const editIconResult = await browser.execute(() => {
            const taskCards = document.querySelectorAll('.todo-flow-task-card');
            const iconTask1 = taskCards[0]?.querySelector('.edit-icon');
            const iconTask2 = taskCards[1]?.querySelector('.edit-icon');
            return {
                task1HasIcon: !!iconTask1,
                task2HasIcon: !!iconTask2
            };
        });
        expect(editIconResult.task1HasIcon).toBe(false);
        expect(editIconResult.task2HasIcon).toBe(true);

        // 5. Verify Parent Context in Header
        console.log('[Test FEAT-002] Navigating to sub-page...');
        await browser.execute(async () => {
            try {
                // @ts-ignore
                const adapter = app.vault.adapter;
                if (!(await adapter.exists('todo-flow/Projects'))) {
                    await adapter.mkdir('todo-flow/Projects');
                }
                // @ts-ignore
                await app.vault.create('todo-flow/Projects/SubTask Container.md', '[[Task 3]]');
            } catch (e) { }
            // @ts-ignore
            const leaf = app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
            const view = leaf?.view as any;
            if (view && view.onNavigate) {
                await view.onNavigate('todo-flow/Projects/SubTask Container.md', 0);
            }
        });

        await browser.waitUntil(async () => {
            const res = await browser.execute(() => {
                const headerParent = document.querySelector('.todo-flow-stack-container[data-ui-ready="true"] [data-testid="header-parent-name"]');
                const text = headerParent?.textContent?.trim();
                // @ts-ignore
                const leaf = app.workspace.getLeavesOfType('todo-flow-stack-view')[0];
                const view = leaf?.view as any;

                const expected = 'SubTask Container';
                const match = text === expected;

                // Diagnostics
                const diag = {
                    found: !!headerParent,
                    text: text || 'NULL',
                    viewParent: view?.parentTaskName || 'NULL',
                    rootPath: view?.rootPath || 'NULL'
                };
                // @ts-ignore
                window._headerDiag = diag;

                return headerParent && match && window.getComputedStyle(headerParent).display !== 'none';
            });
            return res === true;
        }, {
            timeout: 15000,
            timeoutMsg: () => {
                // @ts-ignore
                const d = (global as any)._headerDiag || {};
                return `Header context mismatch: Expected 'SubTask Container', Got: '${d.text}' (View: '${d.viewParent}', Path: '${d.rootPath}')`;
            }
        });

        console.log('[Test FEAT-002] ✅ Header parent context verified');
    });
});
