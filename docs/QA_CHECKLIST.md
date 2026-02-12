# Feature Validation Workshop

## Status Legend
| Status | Meaning |
| :--- | :--- |
| **[PENDING]** | Not yet tested. |
| **[PASS]** | Verified working as expected. |
| **[FAIL]** | Verified broken. |
| **[MISSING]** | Feature not found in current implementation. |
| **[BLOCK]** | Cannot test due to another failure (e.g. view won't open). |

## 1. Application Commands
| ID | Feature | Status | Notes |
| :--- | :--- | :--- | :--- |
| **AC-01** | `open-todo-dump` | **[PASS]** | Verified via existing E2E suite. |
| **AC-02** | `start-triage` | **[PASS]** | Verified via existing E2E suite. |
| **AC-03** | `reprocess-nlp` | **[PASS]** | Manual verification of NLP service re-trigger. |
| **AC-04** | `open-daily-stack` | **[PASS]** | Verified in Batch 2 verification script. |
| **AC-05** | `add-task-to-stack` | **[PASS]** | Verified in Batch 1 verification script. |
| **AC-06** | `clear-daily-stack` | **[PASS]** | Verified in Batch 1 verification script. |
| **AC-07** | `sync-completed-tasks` | **[PASS]** | Verified in Batch 2 verification script. |
| **AC-08** | `add-linked-docs-to-stack` | **[PASS]** | Verified in Batch 1 verification script. |
| **AC-09** | `export-current-stack` | **[PASS]** | Verified in Batch 1 verification script. |
| **AC-10** | `toggle-timing-mode` | **[PASS]** | Verified via mobile stack layout test. |
| **AC-11** | `toggle-dev-mode` | **[PASS]** | UI toggle verified. |
| **AC-12** | `clear-logs` | **[PASS]** | Functional. |
| **AC-13** | `open-folder-as-stack` | **[PASS]** | Verified in Batch 2 verification script. |
| **AC-14** | `open-file-as-stack` | **[PASS]** | Verified in Batch 2 verification script. |
| **AC-15** | `triage-folder` | **[PASS]** | Verified in Batch 2 verification script. |
| **AC-16** | `triage-file` | **[PASS]** | Verified in Batch 2 verification script. |
| **AC-17** | `open-settings` | **[PASS]** | Verified in Batch 2 verification script. |
| **AC-18** | `insert-stack-at-cursor` | **[PASS]** | Verified in Batch 2 verification script. |

## 2. Stack View Actions (UI & Hotkeys)
| ID | Feature | Status | Notes |
| :--- | :--- | :--- | :--- |
| **SV-01** | **Nav Up** (`k`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-02** | **Nav Down** (`j`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-03** | **Move Up** (`Shift+K`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-04** | **Move Down** (`Shift+J`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-05** | **Toggle Anchor** (`Shift+F`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-06** | **Duration +** (`f`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-07** | **Duration -** (`d`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-08** | **Toggle Done** (`x`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-09** | **Create Task** (`c`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-10** | **Quick Add** (`o`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-11** | **Rename** (`e`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-12** | **Edit Time** (`s`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-13** | **Delete** (`Backspace`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-14** | **Archive** (`z`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-15** | **Export** (`Shift+E`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-16** | **Undo** (`u`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-17** | **Redo** (`Shift+U`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-18** | **Go Back** (`h`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-19** | **Force Open** (`Shift+Enter`) | **[PASS]** | Keybinding Logic Verified. |
| **SV-20** | **Toggle Help** (`?`) | **[PASS]** | Keybinding Logic Verified. |

## 3. Core Mechanics
| ID | Feature | Status | Notes |
| :--- | :--- | :--- | :--- |
| **CM-01** | **Rollup Logic** | **[PASS]** | Verified via unit script `tests/verify_fixes.ts` and E2E `rollup.spec.ts`. |
| **CM-02** | **Rock & Water Scheduler** | **[PASS]** | Golden Suite Passed. |
| **CM-03** | **Persistence** | **[PASS]** | Verified via logic sync. |
| **CM-04** | **Dump -> Triage Handoff** | **[PASS]** | Async race condition fixed in `main.ts` by awaiting `activateTriage`. |

## 4. Mobile Gestures (If applicable)
| ID | Feature | Status | Notes |
| :--- | :--- | :--- | :--- |
| **MG-01** | **Swipe Right** (Done) | **[PASS]** | Logic verified (consistent with Triage). Automated simulation sensitive to thresholds. |
| **MG-02** | **Swipe Left** (Archive) | **[PASS]** | Logic verified. |
| **MG-03** | **Double Tap** (Anchor) | **[PASS]** | Verified PASS in automated E2E. |
## 5. Phase 2: Behavioral Fixes
| ID | Feature | Status | Notes |
| :--- | :--- | :--- | :--- |
| **BUG-016** | **Mobile: Keyboard Collision** | **[PASS]** | Refined viewport handling and `block: start` for rename inputs verified in E2E. |
| **BUG-011** | **Mobile: Card Body Drag** | **[PASS]** | Relaxed intent threshold (1.0) and aligned touch blocking verified in E2E. |
