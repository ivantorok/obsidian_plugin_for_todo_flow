import { describe, it, expect, vi } from 'vitest';
import { HistoryManager, type Command } from '../history.js';

describe('HistoryManager', () => {
    it('should execute a command and add it to undo stack', async () => {
        const manager = new HistoryManager();
        const executeMock = vi.fn();
        const undoMock = vi.fn();

        const command: Command = {
            execute: executeMock,
            undo: undoMock,
            description: 'Test Command'
        };

        await manager.executeCommand(command);

        expect(executeMock).toHaveBeenCalledTimes(1);
        expect(manager.canUndo()).toBe(true);
        expect(manager.canRedo()).toBe(false);
    });

    it('should undo a command and move it to redo stack', async () => {
        const manager = new HistoryManager();
        const executeMock = vi.fn();
        const undoMock = vi.fn();

        const command: Command = {
            execute: executeMock,
            undo: undoMock,
            description: 'Test Command'
        };

        await manager.executeCommand(command);
        manager.undo();

        expect(undoMock).toHaveBeenCalledTimes(1);
        expect(manager.canUndo()).toBe(false);
        expect(manager.canRedo()).toBe(true);
    });

    it('should redo a command and move it back to undo stack', async () => {
        const manager = new HistoryManager();
        const executeMock = vi.fn();
        const undoMock = vi.fn();

        const command: Command = {
            execute: executeMock,
            undo: undoMock,
            description: 'Test Command'
        };

        await manager.executeCommand(command);
        manager.undo();
        manager.redo();

        expect(executeMock).toHaveBeenCalledTimes(2); // Once on execute, once on redo
        expect(manager.canUndo()).toBe(true);
        expect(manager.canRedo()).toBe(false);
    });

    it('should clear redo stack when executing a new command after undo', async () => {
        const manager = new HistoryManager();

        const command1: Command = {
            execute: vi.fn(),
            undo: vi.fn(),
            description: 'Command 1'
        };

        const command2: Command = {
            execute: vi.fn(),
            undo: vi.fn(),
            description: 'Command 2'
        };

        await manager.executeCommand(command1);
        manager.undo();
        expect(manager.canRedo()).toBe(true);

        // Execute new command - should clear redo stack
        await manager.executeCommand(command2);
        expect(manager.canRedo()).toBe(false);
    });

    it('should handle multiple undo/redo operations', async () => {
        const manager = new HistoryManager();
        const commands: Command[] = [];

        for (let i = 0; i < 3; i++) {
            commands.push({
                execute: vi.fn(),
                undo: vi.fn(),
                description: `Command ${i}`
            });
            await manager.executeCommand(commands[i]!);
        }

        // Undo all
        manager.undo(); // Command 2
        manager.undo(); // Command 1
        manager.undo(); // Command 0

        expect(manager.canUndo()).toBe(false);
        expect(manager.canRedo()).toBe(true);

        // Redo all
        manager.redo(); // Command 0
        manager.redo(); // Command 1
        manager.redo(); // Command 2

        expect(manager.canUndo()).toBe(true);
        expect(manager.canRedo()).toBe(false);
    });

    it('should do nothing when undo is called on empty stack', () => {
        const manager = new HistoryManager();
        expect(() => manager.undo()).not.toThrow();
        expect(manager.canUndo()).toBe(false);
    });

    it('should do nothing when redo is called on empty stack', () => {
        const manager = new HistoryManager();
        expect(() => manager.redo()).not.toThrow();
        expect(manager.canRedo()).toBe(false);
    });

    it('should clear both stacks', async () => {
        const manager = new HistoryManager();

        const command: Command = {
            execute: vi.fn(),
            undo: vi.fn(),
            description: 'Test Command'
        };

        await manager.executeCommand(command);
        manager.undo();

        expect(manager.canUndo()).toBe(false);
        expect(manager.canRedo()).toBe(true);

        manager.clear();

        expect(manager.canUndo()).toBe(false);
        expect(manager.canRedo()).toBe(false);
    });
});
