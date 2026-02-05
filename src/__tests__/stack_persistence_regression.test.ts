
import { describe, it, expect, vi } from 'vitest';
import { NavigationManager } from '../navigation/NavigationManager.js';
import { type TaskNode } from '../scheduler.js';
import { type StackPersistenceService } from '../services/StackPersistenceService.js';
import { type StackLoader } from '../loaders/StackLoader.js';

// Mock Tasks
const mockTasks: TaskNode[] = [
    { id: '1', title: 'Task 1', duration: 30, status: 'todo', isAnchored: false, children: [] },
    { id: '2', title: 'Task 2', duration: 30, status: 'todo', isAnchored: false, children: [] },
    { id: '3', title: 'Task 3', duration: 30, status: 'todo', isAnchored: false, children: [] }
];

const mockLoader = {
    load: vi.fn(),
    loadSpecificFiles: vi.fn(),
    loadShortlisted: vi.fn(),
    parser: {}
} as any;

const mockApp = {
    metadataCache: {
        on: vi.fn(),
        offref: vi.fn()
    }
} as any;

const mockPersistence = {
    isExternalUpdate: vi.fn().mockReturnValue(true)
} as any;

describe('Reproduction: Stack Persistence & Focus', () => {

    it('should restore exact stack state (archive bug fix)', async () => {
        const nav = new NavigationManager(mockApp, mockLoader as unknown as StackLoader, mockPersistence as unknown as StackPersistenceService);
        mockLoader.load.mockResolvedValue([...mockTasks]);

        // 1. Setup Stack
        nav.setStack([...mockTasks], 'root');

        // 2. Archive Task 2 (Update via View)
        const filteredTasks = mockTasks.filter(t => t.id !== '2');
        nav.setStack(filteredTasks, 'root');

        // 3. Drill Down into Task 1
        mockLoader.load.mockResolvedValueOnce([{ id: 'c1', title: 'Child', duration: 10 }]);
        await nav.drillDown('1', 0);

        // 4. Go Back
        const result = await nav.goBack();

        // 5. Verify Archive Persistence: Task 2 should NOT reappear
        const currentStack = nav.getCurrentStack();
        expect(currentStack.find(t => t.id === '2')).toBeUndefined();
        expect(currentStack.length).toBe(2);
    });

    it('should track focus by ID and restore correctly even if stack reorders', async () => {
        // Setup: A wrapper that reverses the stack on load/restore
        // This simulates a schedule change (e.g. time passing)
        const reverser = (tasks: TaskNode[]) => [...tasks].reverse();

        // Initial Load
        // Input: [A, B] (setStack bypasses preprocessor)
        // View: Index 0=A, Index 1=B
        const nav = new NavigationManager(mockApp, mockLoader as unknown as StackLoader, mockPersistence as unknown as StackPersistenceService, reverser);

        const tasks: TaskNode[] = [
            { id: 'A', title: 'A', duration: 10, status: 'todo' as const, isAnchored: false, children: [] }, // Index 0
            { id: 'B', title: 'B', duration: 10, status: 'todo' as const, isAnchored: false, children: [] }  // Index 1
        ];

        // Initial Load
        // Input: [A, B] (setStack bypasses preprocessor)
        // View: Index 0=A, Index 1=B
        nav.setStack(tasks, 'root');

        // Verify Initial State
        const stack1 = nav.getCurrentStack();
        expect(stack1[0]?.id).toBe('A');
        expect(stack1[1]?.id).toBe('B');

        // User clicks "B" (Index 1) and drills down
        mockLoader.load.mockResolvedValueOnce([{ id: 'c', title: 'child', duration: 10 }]);
        await nav.drillDown('B', 1);

        // Go Back
        // The manager should restore the stack [A, B] from snapshot.
        // It then applies the Preprocessor (Reverser) -> [B, A].
        // "B" (Target) is now at Index 0.
        const result = await nav.goBack();

        expect(result.success).toBe(true);
        expect(result.focusedIndex).toBe(0); // Should now be 0 (B's new position)

        const restoredStack = nav.getCurrentStack();
        expect(restoredStack[result.focusedIndex]?.id).toBe('B');
    });
});
