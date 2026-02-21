# Phase 4 Technical Blueprint: Optimization & Refinement

## 1. StackView De-Monolithization (Zero-Logic Rendering)
To satisfy the **Lean Mobile** axiom, we will split the 2,200-line `StackView.svelte` into discrete presentation layers.

### Component Architecture
- **`ArchitectStack.svelte`**:
    - Optimized for Desktop.
    - Contains: Multi-card focus logic, `Drag/Drop` (Reorder) handlers, `j/k` keyboard navigation, and bulk selection support.
- **`FocusStack.svelte`**:
    - Optimized for Mobile Execution.
    - Contains: Swipe-based actions, single-card centered focus, and minimal layout overhead.
    - **NO** keyboard listeners. **NO** reordering logic.
- **`StackView.svelte` (Orchestrator)**:
    - Lightweight wrapper.
    - Manages the `StackController` instance and routes `navState` to the active stack component.

## 2. Path-Sovereign Locking (Interaction Tokens)
Transitioning from a blunt 2000ms global silence to precise, intent-based locking.

### Protocol Update
- `StackPersistenceService` will implement `claim(path: string, lifetime?: number)` and `release(path: string)`.
- **Automatic Expiry**: Claims have a default TTL of 5000ms to prevent permanent deadlocks if a UI crash occurs.
- **Interaction Hook**: `StackView` will `claim` the path on `touchstart` or `mousedown` and `release` on `touchend/mouseup` (optionally with a 500ms cooldown).
- **Benefit**: Obsidian Sync can update any note *except* the one the user is currently touching, significantly reducing "stale data" flash while maintaining sync responsiveness.

## 3. Optimistic ID Mapping (Hardened QuickAdd)
Protecting the user's momentum during rapid-fire task creation.

### The Action Queue
- `StackController` will maintain a queue of "Pending Actions" mapped to `temp-` IDs.
- **Logic**:
    1. User adds task -> `temp-123` created.
    2. User swiped `temp-123` to 'Done' -> Action stored in `Map<"temp-123", Action[]>`.
    3. `onCreateTask` resolves -> `temp-123` mapped to `Task_A.md`.
    4. Queue for `temp-123` is immediately drained against `Task_A.md`.
- **UI State**: Pending tasks should show a subtle "Saving..." or "Pending" opacity/indicator to manage user expectations.

## 4. Systems Impact & Verification
- **Battery**: Expected reduction in Idle/Interaction CPU usage on mobile by ~40% (via removal of unnecessary desktop watchers/renderers).
- **Stability**: Elimination of "E2E: element not existing" race conditions in Triage journeys.
