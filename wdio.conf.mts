import * as path from "path";
import type { Options } from '@wdio/types';

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
            installerVersion: 'earliest',
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
    waitforTimeout: 10000,
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
    }
};
