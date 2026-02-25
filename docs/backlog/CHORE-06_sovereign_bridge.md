# CHORE-06: Sovereign Bridge (Deterministic E2E Synchronization)
**Capture Date**: `2026-02-25 15:30:00`

## Problem / Goal
E2E tests in the mobile hierarchy (specifically those involving disk-based synchronization) were historically flaky due to non-deterministic race conditions between Obsidian's metadata cache, Svelte's reactive loops, and the plugin's debounced persistence layer.

## Current Behavior (for Bugs)
Tests relied on brittle `browser.pause()` calls. If the disk write or the DOM update took longer than the pause, the test would fail (e.g. Expected 45, Received 30).

## Expected Behavior
Tests should wait for a deterministic "Idle" state that captures the entire Disk-to-DOM cycle.

## Proposed Test Case (TDD)
- [x] E2E Test: `sovereign_bridge_tdd.spec.ts` (Validates the marker exists and correctly reflects idle/busy states).
- [x] E2E Test: `system_persistence_sync.spec.ts` (Revived).
- [x] E2E Test: `behavioral_sovereignty.spec.ts` (Revived).

## Reuse & Architectural Alignment
- **Utilities to Reuse**: `StackPersistenceService`, `StackSyncManager`.
- **Architectural Patterns**: **Handshake Pattern** (Optimistic UI → Disk → DOM Signal).

## UX Governance Compliance
- **Rule Alignment**: **Sovereign Transparency** (UI states like 'Syncing' must be visible to the system, if not the user).

## Context / Constraints
Uses `data-persistence-idle` attribute on the `.todo-flow-stack-container` to signal state to the E2E driver without impacting user performance.
