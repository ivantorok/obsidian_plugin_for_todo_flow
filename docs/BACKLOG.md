# Project Backlog

This document tracks bugs and feature requests. To request work, add an item here or create a detailed spec in `docs/backlog/`.

## 🟢 Phased Roadmap
*Strategic grouping of tasks to ensure structural stability before polishing.*

### Phase 1: Interaction & Space Sovereignty (The Foundation)
| ID | Title | Type | Spec |
| :--- | :--- | :--- | :--- |
| BUG-021 | Schedule Recalculation Jank during Gestures | Bug | [Spec](./backlog/BUG-021_freeze_on_interaction.md) | **[DIAGNOSE]** |
| FEAT-003 | Mobile Modal Capture Side-Channel | Feat | [Spec](./backlog/FEAT-003_modal_capture_mobile.md) |

### Elias 1.1 Features (Shipped)
| ID | Title | Type | Spec | Status |
| :--- | :--- | :--- | :--- | :--- |
| FEAT-001 | Mobile: Chore Addition in Triage | Feat | [Spec](./backlog/FEAT-001_mobile_triage_addition.md) | v1.2.36 |
| FEAT-004 | Perpetual Loop | Feat | [Spec](./backlog/FEAT-004_perpetual_loop.md) | v1.2.45 |
| FEAT-005 | Immersion Capture (Triage) | Feat | [Spec](./backlog/FEAT-005_immersion_capture.md) | v1.2.47 |
| FEAT-006 | Horizon Guardian | Feat | [Spec](./backlog/FEAT-006_horizon_guardian.md) | v1.2.48 |
| FEAT-007 | Sovereign Undo | Feat | [Spec](./backlog/FEAT-007_sovereign_undo.md) | v1.2.48 |
| - | Elias 1.1 Onboarding | Ref | [Spec](./backlog/ELIAS-1.1_onboarding.md) | - |
| - | Release Notes v1.2.39 | Ref | [Notes](./backlog/RELEASE_NOTES_v1.2.39.md) | - |


### Phase 2: Sovereign Navigation & Gestures (The Behavior)
| ID | Title | Type | Spec | Date | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BUG-016 | Mobile: Keyboard and ghost space cover editor | Bug | [Spec](./archive/backlog/BUG-016_mobile_keyboard_collision.md) | 2026-02-11 | v1.2.65 |
| BUG-011 | Mobile: Card body drag-and-drop not working | Bug | [Spec](./archive/backlog/BUG-011_mobile_card_body_drag.md) | 2026-02-11 | v1.2.65 |
| BUG-012 | Mobile: Existing Task Selection via FAB -> Triage Queue | Bug | [Spec](./archive/backlog/BUG-012_existing_task_fab_not_added_to_triage.md) | 2026-02-18 | v1.2.69 (Verified) |
| FEAT-008 | Mobile Stack Parity & Refinements | Feat | [Spec](./backlog/FEAT-008_mobile_stack_parity.md) | v1.2.73 |
| BUG-007 | Sync: External file edits refresh failure | Bug | [Spec](./archive/backlog/BUG-007_external_edit_refresh_failure.md) | 2026-02-11 | **[PLANNED]** |
| BUG-009 | Sync: CurrentStack.md discrepancy & overwrite | Bug | [Spec](./archive/backlog/BUG-009_sync_discrepancy_overwrite.md) | 2026-02-11 | **[PLANNED]** |
| BUG-022 | Quick Add Optimistic ID Race Condition | Bug | [Spec](./backlog/BUG-022_optimistic_id_race_condition.md) | 2026-02-20 | **[PLANNED]** |
| BUG-023 | Sync Window Race Condition | Bug | [Spec](./backlog/BUG-023_sync_window_race_condition.md) | 2026-02-20 | **[PLANNED]** |
| STAB-01 | E2E Stabilization (Rollup & Race Conditions) | Bug | - | 2026-02-12 | v1.2.42 |

### Phase 3: Component Polishing (The Presentation)
| ID | Title | Type | Spec |
| :--- | :--- | :--- | :--- |
| BUG-006 | Mobile: Drag & Drop Precision & Selection | Bug | [Spec](./archive/backlog/BUG-006_mobile_drag_precision_selection.md) | v1.2.73 |
| BUG-007 | Sync: External file edits refresh failure | Bug | [Spec](./archive/backlog/BUG-007_external_edit_refresh_failure.md) | 2026-02-06 | **[MOVED]** |
| BUG-008 | Desktop: Duration buttons broken | Bug | [Spec](./archive/backlog/BUG-008_desktop_duration_buttons_broken.md) | 2026-02-06 | v1.2.37 |
| BUG-009 | Sync: CurrentStack.md discrepancy & overwrite | Bug | [Spec](./archive/backlog/BUG-009_sync_discrepancy_overwrite.md) | 2026-02-06 | **[MOVED]** |
| FIX-01 | Smart Import Folder Bug | Bug | - | 2026-02-01 |
| FIX-02 | Rename Test Stability | Bug | - | 2026-02-01 |

### Phase 4: Strategic Performance
| ID | Title | Type | Spec |
| :--- | :--- | :--- | :--- |
| STRAT-01 | Mobile Performance Optimization (Death by 1000 Cuts) | Ref | [Spec](./backlog/STRAT-01_mobile_performance_optimization.md) | v1.2.66 |
| FEAT-009 | Lean Mobile Split (Elias 2.0 Refactor) | Epic | [Spec](./backlog/FEAT-009_lean_mobile_split.md) | 2026-02-20 |
| CHORE-01 | Pre-push Hook Stdin Conflict | Chore | - | 2026-02-01 |
| CHORE-03 | Permanent Test Run Logging | Chore | [Spec](./backlog/CHORE-03_test_telemetry.md) | 2026-02-19 |

---
**Protocol**: When reporting a bug, create a file in `docs/backlog/` using the template.
**Work**: I (the AI) will move items to "Planned" when I start my `implementation_plan.md`.
