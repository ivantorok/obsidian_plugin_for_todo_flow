# CHORE-04: Decompose `main.ts` God File

**Type**: Chore (Structural)
**Priority**: Medium
**Date**: 2026-02-22
**Source**: Process Governor Audit (Finding 3)

## Problem Statement
`src/main.ts` is **1,166 lines** (~52 KB) and contains plugin lifecycle, view registration, command registration, triage-to-stack handoff orchestration, task creation, sync logic, FAB/QuickAdd integration, DOM manipulation, AND the full settings tab UI. Every feature touches this file.

## Impact
- Merge conflict bottleneck across sessions.
- Poor test isolation — handoff logic is embedded in the plugin class.
- Cognitive load — 40+ outline items in a single file.

## Proposed Decomposition

### Module 1: `CommandRegistry.ts` (~200 lines)
Extract all `this.addCommand(...)` blocks from `onload()` (lines 169–515).

### Module 2: `HandoffOrchestrator.ts` (~180 lines)
Extract `activateTriage()` (lines 553–670) and `activateStack()` (lines 672–731) into a dedicated orchestrator class. This is the core "Triage → Stack" handoff logic that caused BUG-021 and the watcher silencing fix.

### Module 3: `TodoFlowSettingTab.ts` (~230 lines)
Extract the `TodoFlowSettingTab` class (lines 939–1166) into its own file. This is entirely self-contained — it only reads/writes `plugin.settings`.

## Expected Result
`main.ts` should shrink to ~350–400 lines, containing only:
- Plugin lifecycle (`onload`, `onunload`)
- Service initialization
- Delegation to the above modules

## Verification Plan
- All existing unit and E2E tests must pass unmodified (no behavioral change).
- No new tests required (pure structural refactor).

## Notes
- Follow TDD Working Agreement §1 — even for refactors, verify green before AND after.
- The `onload()` method has 16 anonymous callback registrations — consider naming them for debuggability during extraction.
