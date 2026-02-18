# Round 3: Governance & Edge Case Audit

This round identifies "technical traps" and ensures the hybrid model survives real-world turbulence.

## 1. The Empty State (Zen Mode)
When the stack is empty (either at start or after completion):
*   **Card Mode**: Replaced by a "Zen Card" with a single large action: **[Add Task]**.
*   **List Mode**: Shows a friendly "All caught up" message with a centered **[Quick Add]** field.
*   **Physics**: Swiping on an empty state should provide a "rubber-band" effect to indicate the end of the line, but `Swipe Up` can still trigger an exit to a parent stack if applicable.

## 2. Stateless Sync (Obsidian Sync Logic)
To ensure multi-device harmony without state corruption:
*   **Law of One Source**: The MD files are the ONLY source of truth. The plugin state is a reactive projection.
*   **Vault Handshake**: The plugin MUST listen to `metadataCache.on('changed')`. If a task file in the current stack is modified externally (by Sync), the view MUST re-parse that file immediately.
*   **The Sync Sentry (Content Sync)**: While Obsidian doesn't expose a public "Syncing" event, the plugin can peek at the internal Sync plugin (`app.internalPlugins.getPluginById('sync')`). 
    - **Scope**: Monitors the status of the **File System Content** synchronization (the actual markdown files). This is NOT just for plugin settings; it's to ensure the tasks we are projecting into the UI are the same ones the cloud is currently writing to disk.
    - **Physical Feedback**: If the official Obsidian Sync service is actively transferring files, the Todo Flow UI shows a subtle "☁️ Syncing" indicator. 
    - **Conflict Avoidance**: If the Sentry detects an "Out of Sync" or "Uploading/Downloading" state, it disables the **Commit** (Archive/Done) actions temporarily. This prevents the "Split Brain" scenario where you complete a task on Mobile at the exact same time the Desktop version is syncing a title change to the same file.
*   **Mtime Validation**: Before writing to a file, the plugin checks the disk `mtime`. If the disk is newer than our local memory, we resolve the conflict by "Pulling" the disk changes before merging our status update.

## 3. Technical Performance (The Idle Queue)
To prevent "Jank" and race conditions on mobile:
*   **Interaction Sovereignty**: WHILE a user is touching the screen (swiping, dragging), all disk-writes are **Suspended**.
*   **The Idle Sweep**: Writes are queued and executed only when the user is "Idle" (no touch/gesture events) for >300ms.
*   **Atomic Transactions**: We use `vault.process` to ensure that even if a sync occurs mid-write, the file structure remains valid.

## 4. UX Governance Check
*   **Tap Targets**: All buttons (List Icon, Back, Anchor) MUST be at least 44x44px.
*   **Discoverability**: The "List" icon should be a clear affordance (⠿) in the top-right corner of the Card.

---
**Status**: ROUND 3 - DRAFTING
**Role**: Atlas Guardian (AG)
