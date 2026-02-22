import * as path from "path";
import * as fs from "fs";
import type { Options } from '@wdio/types';

const results = { passed: 0, failed: 0, skipped: 0, duration: 0, start: Date.now() };

export const config: Options.Testrunner = {
    //
    // ====================
    // Runner Configuration
    // ====================
    runner: 'local',

    //
    // ==================
    // Specify Test Files
    // ==================
    specs: [
        './tests/e2e/**/*.spec.ts'
    ],
    exclude: [
        'tests/e2e/manual-open.spec.ts',
        'tests/e2e/legacy/**/*.spec.ts'
    ],

    //
    // ============
    // Capabilities
    // ============
    maxInstances: 1,
    capabilities: [{
        browserName: 'obsidian',
        browserVersion: 'latest',
        'wdio:obsidianOptions': {
            installerVersion: 'latest',
            plugins: ['.'],
            vault: './.test-vault',
        }
    }],

    //
    // ===================
    // Test Configurations
    // ===================
    logLevel: 'debug',
    bail: 0,
    waitforTimeout: 15000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    specFileRetries: 2,

    //
    // ========
    // Services
    // ========
    services: ['obsidian'],

    //
    // =========
    // Framework
    // =========
    framework: 'mocha',

    //
    // =========
    // Reporters
    // =========
    reporters: ['obsidian'],

    //
    // ==========
    // Cache Dir
    // ==========
    cacheDir: path.resolve('.obsidian-cache'),

    //
    // =============
    // Mocha Options
    // =============
    mochaOpts: {
        ui: 'bdd',
        timeout: 90000
    },

    //
    // =====
    // Hooks
    // =====
    before: function () {
        console.log('[WDIO] Starting E2E test session');
    },

    after: function () {
        console.log('[WDIO] E2E test session complete');
        results.duration = Date.now() - results.start;
        fs.writeFileSync(
            path.resolve('./logs/wdio-results.json'),
            JSON.stringify(results, null, 2)
        );
    },

    afterTest: async function (test, context, { error, result, duration, passed, retries }) {
        if (passed) results.passed++;
        else results.failed++;
        if (!passed) {
            const screenshotPath = path.resolve(`./tests/e2e/failures/${test.title.replace(/\s+/g, '_')}.png`);
            const screenshotDir = path.dirname(screenshotPath);
            if (!fs.existsSync(screenshotDir)) {
                fs.mkdirSync(screenshotDir, { recursive: true });
            }
            await browser.saveScreenshot(screenshotPath);
            console.log(`[WDIO] Screenshot saved to: ${screenshotPath}`);
        }
    }
};
