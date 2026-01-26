import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileLogger } from '../logger.js';
import { type App, type Vault } from 'obsidian';

describe('Feature: File Logger', () => {
    let mockVault: any;
    let mockApp: any;
    let adapterAppend: any;

    beforeEach(() => {
        adapterAppend = vi.fn().mockResolvedValue(undefined);
        mockVault = {
            adapter: {
                append: adapterAppend
            }
        };
        mockApp = {
            vault: mockVault
        };
    });

    it('should write logs to todo-flow.log when enabled', async () => {
        // 1. Init logger in Enabled mode
        const logger = new FileLogger(mockApp, true); // true = debug enabled

        // 2. Log info
        await logger.info('Test Info Message');

        // 3. Assert append called
        expect(adapterAppend).toHaveBeenCalledTimes(1);
        const [path, content] = adapterAppend.mock.calls[0];
        expect(path).toBe('todo-flow.log');
        expect(content).toContain('[INFO]');
        expect(content).toContain('Test Info Message');
    });

    it('should NOT write logs when disabled', async () => {
        // 1. Init logger in Disabled mode
        const logger = new FileLogger(mockApp, false);

        // 2. Log info
        await logger.info('Should be hidden');

        // 3. Assert NO append
        expect(adapterAppend).not.toHaveBeenCalled();
    });

    it('should format timestamps correctly', async () => {
        const logger = new FileLogger(mockApp, true);
        await logger.info('Time test');
        const content = adapterAppend.mock.calls[0][1];
        // Expect ISO-like or readable timestamp
        expect(content).toMatch(/^\[\d{4}-\d{2}-\d{2}/);
    });
});
