# Testing Strategy & Quality Assurance

This document defines the **"Vertical Oversight"** of our quality assurance process. It bridges the gap between our Architectural Principles (`ARCHITECTURE.md`) and our specific testing implementation guides (`E2E_TESTING.md`).

## 1. The Hierarchy of Truth

When tests disagree, we need a hierarchy to determine which result "wins."

### Level 1: E2E (The User's Finger) 🥇
*   **Scope**: Full browser automation via WebdriverIO.
*   **Authority**: **Highest**. If an E2E test fails, the feature is broken for the user.
*   **What it proves**: "The feature works in the real world."

### Level 2: Integration (The Data Flow) 🥈
*   **Scope**: Svelte component mounting + Mocked Services.
*   **Authority**: **High**. Verifies that components talk to each other correctly.
*   **What it proves**: "The components are wired correctly."

### Level 3: Unit (The Mechanics) 🥉
*   **Scope**: Individual functions, classes, or isolated components.
*   **Authority**: **Medium**. These are the most likely to be "wrong" if they conflict with Architecture.
*   **What it proves**: "The logic is internally consistent."

---

## 2. Test Sovereignty & Architectural Alignment

Our tests must respect the same architectural rules as our production code. A test that violates architectural principles is a **buggy test**.

### Key Principle: Interaction Sovereignty
Just as `StackView` only responds to keys when focused, **tests must explicitly focus elements before interacting**.

*   ❌ **Bad Test**: Dispatching a global window event to test a component.
*   ✅ **Good Test**: `container.focus()`, then dispatch event to `container`.

### Key Principle: The Projection Principle
The UI is a projection of the Disk. Tests should verify that **Disk Writes** happened, not just that the UI updated.

*   ❌ **Bad Test**: Checking if a variable `isAnchored` changed in memory.
*   ✅ **Good Test**: Checking if the `onTaskUpdate` callback was fired with `isAnchored: true`, which implies a disk write.

---

## 3. Resolving Inconsistencies

What do you do when test levels disagree?

### Scenario A: Unit FAIL, E2E PASS
*   **Diagnosis**: The Unit Test is likely brittle or violates an architectural principle (e.g., it bypasses the `Focus` check that E2E naturally handles).
*   **Action**: **Fix the Test**. Make the unit test accurately simulate the architectural constraint.

### Scenario B: Unit PASS, E2E FAIL
*   **Diagnosis**: The component works in isolation, but fails in reality. Likely a CSS issue (`z-index`, `visibility`), a race condition, or a DOM event bubbling issue.
*   **Action**: **Fix the Code**. The feature is broken.

### Scenario C: Local PASS, CI FAIL
*   **Diagnosis**: Environment drift (OS differences, faster/slower CPU).
*   **Action**: **Harden the Test**. Add explicit waits (`await tick()`, `waitForExist`). Do not decrease timeout; increase stability.

### Scenario D: Axiom Conflict
*   **Diagnosis**: The feature implementation requires breaking an established law in the [Concept Atlas](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/atlas/00_INDEX.md) or [UX Governance](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/UX_GOVERNANCE.md).
*   **Action**: **Escalate Upstream**. Do NOT implement a hack or "bypass" in the code. Stop development and return to Step 1 of the Atomic Feedback Loop (Atlas Maintenance) to reconcile the conflict at a design level.


---

## 4. The "Green" Definition

A feature is only "Done" when:
1.  **Usage flows** (E2E) are Green.
2.  **Logic flows** (Unit) are Green.
3.  **Architecture** is respected (no hacks to make tests pass).

---

## 5. Mocking Boundaries & Context Gotchas (Lessons Learned)

These are hard-earned lessons from stabilizing the plugin that might not be obvious to a new pair-programming session:

### 1. Never Mock the Obsidian File System in E2E
When testing features like "External Sync Reaction" or File Watchers in E2E, **do not** mock the event by manually calling a UI update function. You must actually modify the file on disk via `browser.execute` using `app.vault.adapter.process`.
*   **Why**: Mocking the event bypasses the real Obsidian file watcher latency and race conditions (like vault indexing delays). A mocked test will falsely pass even if the real implementation is missing a `waitForPersistenceIdle` guard.

### 2. Svelte Component Isolation (The Obsidian Firewall)
If a Svelte Unit Test requires you to mock Obsidian globals (`app.workspace`, `app.metadataCache`), **the architecture is broken**.
*   **Why**: Svelte components (`StackView.svelte`, `ArchitectStack.svelte`) exist strictly in the "View" layer. They must receive all their context (e.g., `isSyncing`, `tasks`, `viewMode`) as **injected reactive props** from the TypeScript controller (`StackView.ts`).
*   **Rule**: Never import Obsidian API directly into `.svelte` files. If you do, unit testing becomes impossibly brittle.

### 3. Emulating External State Pulses
In testing, we often assume state transitions happen once and cleanly (e.g., `isSyncing = true` directly to `false`). In reality, `StackSyncManager` and Obsidian's debouncers can yield multiple "state pulses" in a span of milliseconds.
*   **Gotcha**: An E2E test verifying a Notice or a CSS class might execute in the microsecond gap between two state pulses, causing intermittent failures.
*   **Fix**: When verifying transient states (like "Syncing..."), use `browser.waitUntil` instead of synchronous `expect()` checks. If a state causes a fundamental UI switch (like changing view modes), the wrapper (`StackView.ts`) MUST have a sovereign memory of that mode rather than relying on the UI to not reset during a rapid remount.

### 4. Time and Timers (The `moment` Trap)
If you mock time in a Unit Test (`vi.setSystemTime`), ensure you mock both `Date.now()` and standard `Date` objects because libraries like `moment.js` rely heavily on the global environment.
*   **Gotcha**: Failing to mock time consistently leads to "Golden Scheduler" tests producing tasks that mysteriously fall into the wrong timeframe because part of the system saw 2024 and part saw 2026.
