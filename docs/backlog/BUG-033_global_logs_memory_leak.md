# BUG-033: Global `_logs` Array Memory Leak
**Capture Date**: `2026-02-24 07:58:00`

## Problem / Goal
A massive memory leak is caused by the application pushing diagnostic log strings into a global `window._logs` array without ever clearing or bounding it. 

## Current Behavior (for Bugs)
Throughout the Codebase (`StackView.ts`, `ArchitectStack.svelte`, etc.), this pattern is used heavily:
```typescript
if (typeof window !== "undefined") ((window as any)._logs = (window as any)._logs || []).push(`[StackView] ...`);
```
Since nothing empties the `_logs` array, it will grow infinitely as the user interacts with the app, consuming memory linearly with every tap, drag, and component update.

## Expected Behavior
The application should use the initialized `FileLogger` instance that is already passed into the components (`this.logger = logger;`) instead of writing to an untyped, unbounded global array on the `window` object. 

## Proposed Test Case (TDD)
- [x] Unit Test: Ensure `StackView` and `ArchitectStack` properly delegate to `FileLogger.info()` or `FileLogger.debug()`.
- [x] E2E Test: Verify that `window._logs` remains empty (Session v8 logs removed).

## Reuse & Architectural Alignment
- **Utilities to Reuse**: `FileLogger`

## UX Governance Compliance
- **Rule Alignment**: N/A (Internal performance/stability issue rather than UX).

## Context / Constraints
- `src/views/StackView.ts`
- `src/views/ArchitectStack.svelte`

## Completion Status
- **Status**: ✅ **COMPLETED** (2026-02-24)
- **Resolution**: Removed all direct pushes to `window._logs`. All components now use the injected `FileLogger`. Verified that `window._logs` is no longer populated during E2E sessions.
- **Reference**: Session v8, CHORE-05.
