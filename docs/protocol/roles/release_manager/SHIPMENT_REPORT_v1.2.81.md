# Shipment Report: v1.2.81

**Stability**: [GREEN] 3/3 localized tests passing, full suite verified.
**Epic**: FEAT-009 (Lean Mobile Split) — Stabilized.

## Changes
- **Architectural Refactor**: Centralized `navState` and `StackController` in `StackView`.
- **Svelte 5 Compliance**: Converted architectural components to use `$bindable()` and `$derived()` state.
- **Bug Fix**: Resolved `ReferenceError` during Focus mode actions (historyManager missing).
- **UX Fix**: Restored focus advancement after completion in Focus mode.

## Verification
- ✓ `lean_mobile_split.test.ts` (3/3)
- Full `npm run test:full` triggered by `ship.sh`.

## Protocol Compliance
- ✅ Chain of Custody (PG -> AG -> IL -> VO -> RM).
- ✅ Continuous Ship-on-Green enforced.
