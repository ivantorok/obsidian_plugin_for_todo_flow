# Project Backlog

This document tracks bugs and feature requests. To request work, add an item here or create a detailed spec in `docs/backlog/`.

## 🟢 Phased Roadmap
*Strategic grouping of tasks to ensure structural stability before polishing.*

### Phase 1: Interaction & Space Sovereignty (The Foundation)
| ID | Title | Type | Spec |
| :--- | :--- | :--- | :--- |
| BUG-021 | Schedule Recalculation Jank during Gestures | Bug | [Spec](./backlog/BUG-021_freeze_on_interaction.md) | v1.2.88 |
| FEAT-003 | Mobile Modal Capture Side-Channel | Feat | [Spec](./backlog/FEAT-003_modal_capture_mobile.md) |

### Elias 1.1 Features (Shipped)
| ID | Title | Type | Spec | Status |
| :--- | :--- | :--- | :--- | :--- |
| FEAT-001 | Mobile: Chore Addition in Triage | Feat | [Spec](./archive/backlog/FEAT-001_mobile_triage_addition.md) | v1.2.36 |
| FEAT-004 | Perpetual Loop | Feat | [Spec](./archive/backlog/FEAT-004_perpetual_loop.md) | v1.2.45 |
| FEAT-005 | Immersion Capture (Triage) | Feat | [Spec](./archive/backlog/FEAT-005_immersion_capture.md) | v1.2.47 |
| FEAT-006 | Horizon Guardian | Feat | [Spec](./archive/backlog/FEAT-006_horizon_guardian.md) | v1.2.48 |
| FEAT-007 | Sovereign Undo | Feat | [Spec](./archive/backlog/FEAT-007_sovereign_undo.md) | v1.2.48 |
| - | Elias 1.1 Onboarding | Ref | [Spec](./archive/backlog/ELIAS-1.1_onboarding.md) | - |
| - | Release Notes v1.2.39 | Ref | [Notes](./backlog/RELEASE_NOTES_v1.2.39.md) | - |


### Phase 2: Sovereign Navigation & Gestures (The Behavior)
| ID | Title | Type | Spec | Date | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BUG-016 | Mobile: Keyboard and ghost space cover editor | Bug | [Spec](./archive/backlog/BUG-016_mobile_keyboard_collision.md) | 2026-02-11 | v1.2.65 |
| BUG-011 | Mobile: Card body drag-and-drop not working | Bug | [Spec](./archive/backlog/BUG-011_mobile_card_body_drag.md) | 2026-02-11 | v1.2.65 |
| BUG-012 | Mobile: Existing Task Selection via FAB -> Triage Queue | Bug | [Spec](./archive/backlog/BUG-012_existing_task_fab_not_added_to_triage.md) | 2026-02-18 | v1.2.69 (Verified) |
| FEAT-008 | Mobile Stack Parity & Refinements | Feat | [Spec](./backlog/FEAT-008_mobile_stack_parity.md) | v1.2.73 |
| BUG-007 | Sync: External file edits refresh failure | Bug | [Spec](./archive/backlog/BUG-007_external_edit_refresh_failure.md) | v1.2.88 |
| BUG-009 | Sync: CurrentStack.md discrepancy & overwrite | Bug | [Spec](./archive/backlog/BUG-009_sync_discrepancy_overwrite.md) | v1.2.88 |
| BUG-022 | Quick Add Optimistic ID Race Condition | Bug | [Spec](./archive/backlog/BUG-022_optimistic_id_race_condition.md) | 2026-02-20 | v1.2.78 |
| BUG-023 | Sync Window Race Condition | Bug | [Spec](./archive/backlog/BUG-023_sync_window_race_condition.md) | v1.2.88 |
| STAB-01 | E2E Stabilization (Rollup & Race Conditions) | Bug | - | 2026-02-12 | v1.2.42 |

### Phase 3: Component Polishing (The Presentation)
| ID | Title | Type | Spec | Date | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BUG-006 | Mobile: Drag & Drop Precision & Selection | Bug | [Spec](./archive/backlog/BUG-006_mobile_drag_precision_selection.md) | 2026-02-11 | v1.2.73 |
| BUG-008 | Desktop: Duration buttons broken | Bug | [Spec](./archive/backlog/BUG-008_desktop_duration_buttons_broken.md) | 2026-02-06 | v1.2.37 |
| FIX-01 | Smart Import Folder Bug | Bug | - | 2026-02-01 | |
| FIX-02 | Rename Test Stability | Bug | - | 2026-02-01 | |

### Phase 4: Strategic Performance
| ID | Title | Type | Spec |
| :--- | :--- | :--- | :--- |
| STRAT-01 | Mobile Performance Optimization (Death by 1000 Cuts) | Ref | [Spec](./backlog/STRAT-01_mobile_performance_optimization.md) | v1.2.66 |
| FEAT-009 | Lean Mobile Split (Elias 2.0 Refactor) | Epic | [Spec](./backlog/FEAT-009_lean_mobile_split.md) | 2026-02-20 |
| CHORE-01 | Pre-push Hook Stdin Conflict | Chore | - | 2026-02-01 |
| CHORE-03 | Permanent Test Run Logging | Chore | [Spec](./backlog/CHORE-03_test_telemetry.md) | 2026-02-19 |
| CHORE-04 | Decompose `main.ts` God File | Chore | [Spec](./archive/backlog/CHORE-04_main_ts_decomposition.md) | 2026-02-22 | v1.2.84 |
| CHORE-05 | Decompose `ArchitectStack.svelte` Monolith | Chore | [Spec](./backlog/CHORE-05_architect_stack_refactor.md) | |
| BUG-033 | Global `_logs` Array Memory Leak | Bug | [Spec](./backlog/BUG-033_global_logs_memory_leak.md) | |

### Phase 5: Mobile UX Polish (2026-02-22 Live Session Feedback)
| ID | Title | Type | Spec | Priority |
| :--- | :--- | :--- | :--- | :--- |
| BUG-024 | ✅ Dump — Missing "Finish" Button | Bug | [Spec](./archive/backlog/BUG-024_dump_missing_finish_button.md) | High | v1.2.80 |
| BUG-025 | Triage — "Shortlist All" Bulk Action | Feat | [Spec](./backlog/BUG-025_triage_select_all_shortlist.md) | Medium | **[PLANNED]** |
| BUG-026 | ✅ Stack View — Pink Background Present | Bug | [Spec](./archive/backlog/BUG-026_stack_pink_background.md) | High | v1.2.80 |
| BUG-027 | ✅ Daily Stack — Opens in Card Mode (Should Be List) | Bug | [Spec](./archive/backlog/BUG-027_stack_opens_in_card_mode.md) | **Critical** | v1.2.80 |
| BUG-028 | ✅ Header Bar — Excessive Height | Bug | [Spec](./archive/backlog/BUG-028_header_bar_too_thick.md) | High | v1.2.80 |
| BUG-029 | ✅ Touch — Any Touch Opens Task Unintentionally | Bug | [Spec](./archive/backlog/BUG-029_tap_opens_task_unintentionally.md) | **Critical** | v1.2.80 |
| BUG-030 | ✅ Editing Element Scrolls Behind Header | Bug | [Spec](./archive/backlog/BUG-030_edit_scrolls_behind_header.md) | High | v1.2.80 |
| BUG-031 | ✅ Text Clipping on Two-Line Card Titles | Bug | [Spec](./archive/backlog/BUG-031_text_clipping_two_lines.md) | Medium | v1.2.80 |
| BUG-032 | ✅ Start Time Edit Does Not Anchor Task | Bug | [Spec](./archive/backlog/BUG-032_start_time_edit_no_anchor.md) | High | v1.2.80 |
| *(overlap)* | Drag-then-open intent bleed | — | → Extends BUG-029 | — |
| *(overlap)* | Reorder auto-scroll conflict | — | → Extends BUG-006 | — |
| *(overlap)* | Default mode ambiguity (Triage/Stack) | — | → Addressed by BUG-027 + FEAT-010 | — |
| *(question)* | Cheap UI/UX testing methodology | — | → See AG routing below | — |

---
**Protocol**: When reporting a bug, create a file in `docs/backlog/` using the template.
**Work**: I (the AI) will move items to "Planned" when I start my `implementation_plan.md`.
