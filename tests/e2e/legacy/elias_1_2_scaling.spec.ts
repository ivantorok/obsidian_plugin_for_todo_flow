import { browser, expect, $ } from '@wdio/globals';
import { emulateMobile } from './mobile_utils.js';
import { setupStackWithTasks, focusStack } from './e2e_utils.js';
import { cleanupVault } from './test_utils.js';

describe('Elias 1.2: Duration Scaling', () => {

    before(async function () {
        // @ts-ignore
        await browser.reloadObsidian({ vault: './.test-vault' });
        await emulateMobile();
    });

    after(async function () {
        await cleanupVault();
    });

    it('should scale duration up and down on mobile', async () => {
        await setupStackWithTasks(['Task A']);
        await focusStack();

        const duration = await $('[data-testid="lean-task-duration"]');
        await duration.waitForDisplayed({ timeout: 10000 });

        // Initial 30m
        expect(await duration.getText()).toBe('30m');

        const plusBtn = await $('[data-testid="lean-scale-up-btn"]');
        const minusBtn = await $('[data-testid="lean-scale-down-btn"]');

        // Scale Up: 30m -> 45m
        await plusBtn.click();
        // @ts-ignore
        await browser.pause(500);
        expect(await duration.getText()).toBe('45m');

        // Scale Up again: 45m -> 60m
        await plusBtn.click();
        // @ts-ignore
        await browser.pause(500);
        expect(await duration.getText()).toBe('60m');

        // Scale Down: 60m -> 45m
        await minusBtn.click();
        // @ts-ignore
        await browser.pause(500);
        expect(await duration.getText()).toBe('45m');

        // Scale Down again: 45m -> 30m
        await minusBtn.click();
        // @ts-ignore
        await browser.pause(500);
        expect(await duration.getText()).toBe('30m');

        // Scale Down: 30m -> 20m
        await minusBtn.click();
        // @ts-ignore
        await browser.pause(500);
        expect(await duration.getText()).toBe('20m');
    });

    it('should support scaling via keyboard shortcuts [ and ]', async () => {
        await setupStackWithTasks(['Shortcut Task']);
        await focusStack();
        const duration = await $('[data-testid="lean-task-duration"]');

        // Starts at 20m (from previous test state if not reset, but setupStackWithTasks resets)
        // Actually setupStackWithTasks reloads Obsidian, so it should be 30m.
        await duration.waitForDisplayed({ timeout: 5000 });
        expect(await duration.getText()).toBe('30m');

        // Scale Up via ]
        // @ts-ignore
        await browser.keys([']']);
        // @ts-ignore
        await browser.pause(500);
        expect(await duration.getText()).toBe('45m');

        // Scale Down via [
        // @ts-ignore
        await browser.keys(['[']);
        // @ts-ignore
        await browser.pause(500);
        expect(await duration.getText()).toBe('30m');
    });
});
