# Walkthrough — Process Governor (RAM Pressure Throttling)

Implemented a `ProcessGovernor` singleton service to prevent crashes on low-RAM devices by monitoring JS heap usage and throttling heavy operations under memory pressure.

## Changes

### [NEW] ProcessGovernor.ts
- Reads `performance.memory.usedJSHeapSize` / `jsHeapSizeLimit`.
- `PressureLevel` enum: `NORMAL`, `YELLOW` (≥70% heap), `RED` (≥90% heap).
- Public API: `isHighPressure()`, `isCriticalPressure()`, `logStatus()`.

### [MODIFY] main.ts
- Governor singleton initialized on plugin load.

### [MODIFY] GraphBuilder.ts
- **YELLOW**: `maxDepth` reduced by 1.
- **RED**: `maxDepth` halved (minimum 1).

### [MODIFY] scheduler.ts
- `computeSchedule` accepts optional `{ highPressure?: boolean }`.
- Under high pressure: skips expensive BFS audit (`getTotalGreedyDuration`).

### [MODIFY] StackController.ts / StackView.ts / StackView.svelte
- `highPressure` flag propagated from governor through all compute paths.
- `updateTime()` defers `computeSchedule` entirely under high pressure.

## Throttling Behaviour

```
JS heap < 70%  → NORMAL  — full computation
JS heap 70-90% → YELLOW  — skip scheduler audit; defer updateTime; reduce graph depth by 1
JS heap ≥ 90%  → RED     — all of above; halve graph maxDepth
```

## Verification

| Check | Result |
|---|---|
| `npm run build` | ✅ 0 errors |
| Unit tests (288 tests, 86 suites) | ✅ All pass |
| E2E (13 spec files) | ✅ Pass |
| E2E (9 Phase 4 Skeptical Specs) | ⚠️ Expected pre-existing failures — unrelated |
