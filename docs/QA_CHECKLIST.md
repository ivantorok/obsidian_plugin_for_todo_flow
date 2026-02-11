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
| **AC-01** | `open-todo-dump` | **[BLOCK]** | E2E Environment Failure. |
| **AC-02** | `start-triage` | **[BLOCK]** | E2E Environment Failure. |
| **AC-03** | `reprocess-nlp` | **[BLOCK]** | E2E Environment Failure. |
| **AC-04** | `open-daily-stack` | **[BLOCK]** | E2E Environment Failure. |
| **AC-05** | `add-task-to-stack` | **[BLOCK]** | E2E Environment Failure. |
| **AC-06** | `clear-daily-stack` | **[BLOCK]** | E2E Environment Failure. |
| **AC-07** | `sync-completed-tasks` | **[BLOCK]** | E2E Environment Failure. |
| **AC-08** | `add-linked-docs-to-stack` | **[BLOCK]** | E2E Environment Failure. |
| **AC-09** | `export-current-stack` | **[BLOCK]** | E2E Environment Failure. |
| **AC-10** | `toggle-timing-mode` | **[BLOCK]** | E2E Environment Failure. |
| **AC-11** | `toggle-dev-mode` | **[BLOCK]** | E2E Environment Failure. |
| **AC-12** | `clear-logs` | **[BLOCK]** | E2E Environment Failure. |
| **AC-13** | `open-folder-as-stack` | **[BLOCK]** | E2E Environment Failure. |
| **AC-14** | `open-file-as-stack` | **[BLOCK]** | E2E Environment Failure. |
| **AC-15** | `triage-folder` | **[BLOCK]** | E2E Environment Failure. |
| **AC-16** | `triage-file` | **[BLOCK]** | E2E Environment Failure. |
| **AC-17** | `open-settings` | **[BLOCK]** | E2E Environment Failure. |
| **AC-18** | `insert-stack-at-cursor` | **[BLOCK]** | E2E Environment Failure. |

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
| **CM-01** | **Rollup Logic** | **[PASS]** | Verified via unit script `tests/verify_fixes.ts`. Children now persist even when parent is DONE. |
| **CM-02** | **Rock & Water Scheduler** | **[PASS]** | Golden Suite Passed. |
| **CM-03** | **Persistence** | **[PASS]** | Verified via logic sync. |
| **CM-04** | **Dump -> Triage Handoff** | **[PASS]** | Async race condition fixed in `main.ts` by awaiting `activateTriage`. |

## 4. Mobile Gestures (If applicable)
| ID | Feature | Status | Notes |
| :--- | :--- | :--- | :--- |
| **MG-01** | **Swipe Right** (Done) | **[BLOCK]** | E2E Blocked. |
| **MG-02** | **Swipe Left** (Archive) | **[BLOCK]** | E2E Blocked. |
| **MG-03** | **Double Tap** (Anchor) | **[BLOCK]** | E2E Blocked. |
