# Walkthrough: Resolving Subtask Persistence Bug (FEAT-018)

I have successfully resolved the issue where reordered subtasks were not being correctly persisted to the markdown file. The fix involved addressing a race condition in the persistence queue, ensuring relative wikilink generation, and hardening the E2E test suite.

## Changes

### 1. Persistence Queue Hardening
I identified a potential race condition in `InteractionIdleQueue.ts` where immediate save requests (e.g., during reordering) could bypass the buffer drainage if timed perfectly.

- **File**: [InteractionIdleQueue.ts](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/src/services/InteractionIdleQueue.ts)
- **Fix**: Synchronized the `flush` method to ensure that all buffered requests are awaited before a new immediate request is processed.

### 2. Relative Wikilink Generation
Obsidian typically uses relative paths for wikilinks within the same directory. Our previous implementation was using absolute paths (relative to the vault root), which caused "ghost" links or broken hierarchies in some contexts.

- **File**: [LinkParser.ts](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/src/parsers/LinkParser.ts)
- **Fix**: Updated `replaceLinksInContent` to strip the parent directory prefix from wikilinks when the child task resides in the same folder as the parent.

### 3. Reliable Physical Persistence
To ensure that automated tests encounter the same state as the physical disk, I transitioned from the high-level Obsidian API to the direct vault adapter for subtask updates.

- **File**: [StackPersistenceService.ts](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/src/services/StackPersistenceService.ts)
- **Fix**: Replaced `app.vault.modify` with `app.vault.adapter.write` for subtask persistence. This ensures that the operating system's file system buffers are updated immediately, allowing Node.js `fs` operations in tests to see the changes reliably.

### 4. E2E Test Robustness
Resolved a discrepancy where the test runner was verifying the original fixture files instead of the active temporary vault files.

- **File**: [substack_reordering.spec.ts](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/tests/e2e/journeys/substack_reordering.spec.ts)
- **Fix**: 
    - Implemented dynamic path resolution using the Obsidian `basePath`.
    - Added a polling mechanism (`browser.waitUntil`) for disk checks to account for file system synchronization delays.

## Verification Results

### Automated Tests
The E2E test suite now consistently passes for subtask reordering.

```bash
» tests/e2e/journeys/substack_reordering.spec.ts
FEAT-018: Substack Reordering
   ✓ should visually present the children in their initial order
   ✓ should physically persist order to the markdown file when reordered via UI

2 passing (4.7s)
```

### Manual Verification
Visual confirmation of the reordering logic and physical file content check was performed during the debugging process. The generated markdown now correctly reflects the relative link format:

```markdown
# Parent
- [ ] [[reorder_child_3|Child 3]]
- [ ] [[reorder_child_1|Child 1]]
- [ ] [[reorder_child_2|Child 2]]
```
