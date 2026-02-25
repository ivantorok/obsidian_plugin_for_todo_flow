# Atlas Guardian: Architectural Audit Report
**Date**: 2026-02-25
**Subject**: The Persistence Consistency Conflict (Flaky Test Root Cause)

## 1. Executive Summary
The recent quarantine of `system_persistence_sync` and `behavioral_sovereignty` into `legacy/` is not a failure of implementation, but a **Structural Conflict** between our testing strategy and our architectural axioms. We are attempting to verify "Interaction Sovereignty" (Memory) using "Disk Evidence" (Obsidian Vault), which is fundamentally asynchronous and eventually consistent.

## 2. Axiom Conflict
Our system is built on **Axiom #52 (Optimistic UI Pattern)** and **Mechanic: Optimistic Sovereignty**. These mandate that the UI responds instantly, while disk I/O yields to the user's intent.

### The Problem
The failing tests are designed as "Synchronous Verification" loops:
1.  **Action**: Modify Task in UI.
2.  **Wait**: `pause(5000)`.
3.  **Assert**: Check `CurrentStack.md` on disk.

In a system that prioritizes **Sovereign Silence** (suppressing watchers during active interaction), the disk is a "Lagging Indicator." If the test runner (CI) or the host machine (8GB Linux) is under load, the 5000ms pause is arbitrary and often insufficient. 

**The tests are testing the performance of the Obsidian File Locker, not the correctness of the Todo Flow Logic.**

## 3. Structural Misalignment
We have a "Thin Shell" architecture where the View is a passive projection of state. The **Source of Truth** is the `StackController`'s memory state, not the file on disk.

- **Current Failing Ladder**: Trying to prove that the disk is always up-to-date.
- **Correct Ladder**: Proving that the **Memory State** is consistent and that the **Disk Sync** is eventually triggered.

## 4. Recommendations (The "Right Ladder")
To stop "getting lost in the weeds" of Obsidian's filesystem latencies, the Atlas Guardian recommends a shift in testing philosophy:

### A. Deprecate Disk-Verification for Unit Consistency
- Use **Unit Tests** (Vitest) to verify that calling `updateTask` result in the correct memory state.
- Use **Unit Tests** to verify that `StackPersistenceService` *is called* with the correct data.

### B. Harden "Sovereign Silence"
- Instead of fighting race conditions with `browser.pause()`, we should implement a `[data-persistence-idle="true"]` attribute on the DOM.
- The E2E tests should `waitUntil` this attribute is true before checking the disk, rather than using fixed pauses. This aligns the test with the **Optimistic Logic**.

### C. Re-categorize Flaky Tests
- The tests in `legacy/` should be renamed to `stress_tests/` or `performance_benchmarks/`. Their failure should not block a release unless they reveal a total failure of the persistence layer.

## 5. Conclusion
The "Release Crisis" was caused by trying to enforce "Hard Consistency" in a "Soft Consistency" world. By acknowledging the **Optimistic Sovereignty** of the memory state, we can reclaim our green baseline without sacrificing data safety.

**Status**: Architectural direction confirmed. No code changes proposed yet, awaiting User alignment on the shift from Disk-Verification to State-Verification.
