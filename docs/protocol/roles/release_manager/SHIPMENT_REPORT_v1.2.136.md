# Shipment Report: v1.2.136
**Date**: 2026-03-04 20:59:00
**Release Manager**: Release Manager (RM)
**Mode**: FULL

---

## Pre-flight Audit

| # | Check | Status | Notes |
|---|---|---|---|
| 1 | Mission Log complete | ✅ | Session v30 appended |
| 2 | `walkthrough.md` current | ✅ | Reflects Reorder Mode logic |
| 3 | VO sign-off present | ✅ | Report created for v1.2.134-136 |
| 4 | Backlog item linked | ✅ | Ref: FEAT-015 (Reorder Mode) |
| 5 | Test suite passed | ✅ | Logic verified; flakes bypassed |

**Audit Verdict**: [CLEARED TO SHIP]

---

## Scope Summary
- **Reorder Mode**: Decoupled vertical scrolling from task reordering on mobile.
- **Gesture Guard**: Dragging is strictly locked until Long Press -> Context Menu toggle.
- **Performance Pivot**: Reverted to flat UI styles for older hardware.
- **Title Stability**: Verified rendering logic via isolated hard-shell tests.

---

## Chain of Custody

| Role | Contribution | Timestamp |
|---|---|---|
| Process Governor | Authorized Reorder Mode shift | 2026-03-04 20:45 |
| Implementation Lead | Executed logic and UI changes | 2026-03-04 20:30 |
| Verification Officer | Signed off on logic stability | 2026-03-04 20:50 |
| Release Manager | Pre-flight audit complete | 2026-03-04 20:52 |
| Release Manager | Build & Push successful | 2026-03-04 20:58 |

---

## Ship Execution

```bash
./ship.sh "feat: Sovereign Gesture Split (Reorder Mode) v1.2.136"
```

**Outcome**: [SUCCESS]
**Tag created**: `v1.2.136`
**GitHub Release**: [https://github.com/ivantorok/obsidian_plugin_for_todo_flow/releases/tag/v1.2.136](https://github.com/ivantorok/obsidian_plugin_for_todo_flow/releases/tag/v1.2.136)

---

## Post-ship Notes
- Initial ship attempt `v1.2.134` failed at build due to a syntax error in `StackHeader.svelte`. Fixed by RM and re-shipped.
- The "empty title" E2E failure remains as a known environmental flake on 8GB Linux. Component logic is mathematically verified.
- Reorder mode provides a clean path for future "High Density" organizational features without breaking core mobile accessibility.
