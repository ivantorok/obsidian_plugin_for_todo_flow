import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import DumpViewHardShell from './DumpViewHardShell.svelte';
import { DumpController } from './DumpController.js';

// Mock DumpController
vi.mock('./DumpController', () => {
    return {
        DumpController: class {
            submitThought = vi.fn().mockImplementation((thought) => {
                return Promise.resolve({
                    id: 'test-path',
                    title: thought,
                    status: 'todo',
                    duration: 30,
                    isAnchored: false,
                    children: []
                });
            });
        }
    };
});

describe('DumpViewHardShell Behavioral Baseline', () => {
    const mockApp = {} as any;
    const mockLogger = { info: vi.fn() } as any;
    const mockOnComplete = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should focus the input on mount', async () => {
        const { getByPlaceholderText } = render(DumpViewHardShell, {
            props: {
                app: mockApp,
                folder: 'test-folder',
                logger: mockLogger,
                onComplete: mockOnComplete
            }
        });

        const input = getByPlaceholderText('Type and press Enter...') as HTMLTextAreaElement;
        expect(document.activeElement).toBe(input);
    });

    it('should submit thought on Enter', async () => {
        const { getByPlaceholderText, queryByText } = render(DumpViewHardShell, {
            props: {
                app: mockApp,
                folder: 'test-folder',
                logger: mockLogger,
                onComplete: mockOnComplete
            }
        });

        const input = getByPlaceholderText('Type and press Enter...') as HTMLTextAreaElement;

        await fireEvent.input(input, { target: { value: 'Buy milk' } });
        await fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() => {
            expect(input.value).toBe('');
            expect(queryByText('1 thought captured')).toBeTruthy();
        });
    });

    it('should call onComplete when "done" is entered', async () => {
        const { getByPlaceholderText } = render(DumpViewHardShell, {
            props: {
                app: mockApp,
                folder: 'test-folder',
                logger: mockLogger,
                onComplete: mockOnComplete
            }
        });

        const input = getByPlaceholderText('Type and press Enter...') as HTMLTextAreaElement;

        await fireEvent.input(input, { target: { value: 'done' } });
        await fireEvent.keyDown(input, { key: 'Enter' });

        expect(mockOnComplete).toHaveBeenCalled();
    });

    it('should call onComplete when Finish button is clicked', async () => {
        const { getByText } = render(DumpViewHardShell, {
            props: {
                app: mockApp,
                folder: 'test-folder',
                logger: mockLogger,
                onComplete: mockOnComplete
            }
        });

        const button = getByText('Finish Dump →');
        await fireEvent.click(button);

        expect(mockOnComplete).toHaveBeenCalled();
    });
});
