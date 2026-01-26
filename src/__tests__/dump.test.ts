import { describe, it, expect, vi } from 'vitest';
import { DumpController } from '../views/DumpController.js';
import type { App, TFolder, Vault } from 'obsidian';

describe('DumpController', () => {
    it('should create a file when a thought is submitted', async () => {
        const mockVault = {
            create: vi.fn().mockResolvedValue({}),
            getAbstractFileByPath: vi.fn().mockReturnValue({} as TFolder)
        };
        const mockApp = {
            vault: mockVault as unknown as Vault
        } as App;

        const controller = new DumpController(mockApp, 'todo-flow');
        await controller.submitThought('Fix the bug');

        expect(mockVault.create).toHaveBeenCalled();
        const callArgs = mockVault.create.mock.calls[0]!;
        // Path should include folder and the generated filename
        expect(callArgs[0]).toMatch(/^todo-flow\/.*-Fix-the-bug\.md$/);
        // Content should have default metadata
        expect(callArgs[1]).toContain('task: Fix the bug');
        expect(callArgs[1]).toContain('status: todo');
        expect(callArgs[1]).toContain('duration: 30');
        expect(callArgs[1]).toContain('type: task');
        expect(callArgs[1]).toMatch(/created: \d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
    });

    it('should ensure target folder exists', async () => {
        const mockVault = {
            create: vi.fn().mockResolvedValue({}),
            createFolder: vi.fn().mockResolvedValue({}),
            getAbstractFileByPath: vi.fn().mockReturnValue(null) // Folder missing
        };
        const mockApp = {
            vault: mockVault as unknown as Vault
        } as App;

        const controller = new DumpController(mockApp, 'todo-flow');
        await controller.submitThought('Another thought');

        expect(mockVault.createFolder).toHaveBeenCalledWith('todo-flow');
    });
});
