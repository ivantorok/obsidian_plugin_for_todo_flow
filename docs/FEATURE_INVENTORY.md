# Feature Inventory

This document lists the atomic features, commands, and UI actions available in the Todo Flow plugin. It serves as a reference for E2E testing coverage.

## 1. Application Commands
These commands are available via the Obsidian Command Palette (`Cmd+P` > "Todo Flow: ...").

| Command ID | Display Name | Internal Action / Effect |
| :--- | :--- | :--- |
| `open-todo-dump` | Open Todo Dump | Activates `VIEW_TYPE_DUMP`. |
| `start-triage` | Start Triage | Activates `VIEW_TYPE_TRIAGE` with pending tasks. |
| `reprocess-nlp` | Reprocess NLP Metadata | Re-runs Smart Parse on the current stack items. |
| `open-daily-stack` | Open Daily Stack | Activates `VIEW_TYPE_STACK` (loads `CurrentStack.md` or last session). |
| `add-task-to-stack` | Add Task to Stack | Opens the Quick Add modal in the stack view. |
| `clear-daily-stack` | Clear Daily Stack | Wipes the current stack (with confirmation). |
| `sync-completed-tasks` | Sync Completed Tasks... | Import changes from an export file back to the vault. |
| `add-linked-docs-to-stack` | Add Linked Docs to Stack | Scans active note for links and adds them to the stack. |
| `export-current-stack` | Export to Note | Copies stack as markdown to clipboard (and saves if configured). |
| `toggle-timing-mode` | Toggle Timing Mode | Switch between Dynamic (Now) and Fixed (e.g. 09:00). |
| `toggle-dev-mode` | Toggle Developer Mode | Enables verbose logging. |
| `clear-logs` | Clear Log File | Wipes `todo-flow.log`. |
| `open-folder-as-stack` | Open Folder as Stack | Prompts for a folder, loads all MD files as tasks. |
| `open-file-as-stack` | Open File as Stack | Prompts for a file, loads it as a single-item stack (or children). |
| `triage-folder` | Triage Folder | Prompts for folder, sends all MD files to Triage view. |
| `triage-file` | Triage File | Prompts for file, sends linked tasks to Triage view. |
| `open-settings` | Open Settings | Opens the plugin settings tab. |
| `insert-stack-at-cursor` | Insert Stack at Cursor | Inserts markdown representation of stack into active editor. |

## 2. Stack View Actions (UI & Hotkeys)
These actions are performed within the **Daily Stack** view.

### Keyboard Shortcuts (Default) & UI Buttons

| Action | Default Key | UI Element | Description |
| :--- | :--- | :--- | :--- |
| **Nav Up** | `k` / `↑` | - | Move focus up without moving task. |
| **Nav Down** | `j` / `↓` | - | Move focus down without moving task. |
| **Move Up** | `K` (Shift+k) / `Shift+↑` | - | Move focused task up. |
| **Move Down** | `J` (Shift+j) / `Shift+↓` | - | Move focused task down. |
| **Toggle Anchor** | `Shift+F` | ⚓ Badge | Lock/Unlock start time. |
| **Duration +** | `f` / `→` | `+` Button | Increase duration (usually +15m). |
| **Duration -** | `d` / `←` | `-` Button | Decrease duration (usually -15m). |
| **Toggle Done** | `x` / `X` | Strikethrough | Mark task as complete/incomplete. |
| **Create Task** | `c` / `C` | - | Open Quick Add with new task. |
| **Quick Add** | - | - | Custom via settings. |
| **Rename** | `e` | Click Title | Edit task title. |
| **Edit Time** | `s` | Click Time | Edit start time explicitly. |
| **Delete** | `Backspace` / `Delete` | - | Delete task (with confirmation). |
| **Archive** | `z` / `Z` | - | Archive task (remove from stack, set state to archived). |
| **Export** | `Shift+E` / `Cmd+s` | Export Icon | Trigger export command. |
| **Undo** | `u` / `U` | Shake (Mobile) | Undo last action. |
| **Redo** | `Shift+U` | - | Redo last action. |
| **Go Back** | `h` | - | Navigate back from sub-stack. |
| **Force Open** | `Shift+Enter` | - | Force open task file. |
| **Toggle Help** | `?` | `?` Button | Show keyboard shortcuts overlay. |

### Mouse / Touch Gestures
| Gesture | Action | Default Behavior |
| :--- | :--- | :--- |
| **Swipe Right** | `swipeRightAction` | Complete |
| **Swipe Left** | `swipeLeftAction` | Archive |
| **Double Tap** | `doubleTapAction` | Anchor |
| **Long Press** | - | (Not explicitly handled in StackView, native context menu might appear) |
| **Drag & Drop** | - | Reorder tasks. |

## 3. Settings
Configurable in `Settings > Todo Flow`.

| Setting | Type | Description |
| :--- | :--- | :--- |
| `targetFolder` | Text | Folder for new tasks. |
| `exportFolder` | Text | Folder for exports. |
| `timingMode` | Dropdown | 'now' (Dynamic) or 'fixed'. |
| `fixedStartTime` | Text | Start time for 'fixed' mode (e.g. 09:00). |
| `enableShake` | Toggle | Enable Shake-to-Undo on mobile. |
| `debug` | Toggle | Developer Mode. |
| `traceVaultEvents` | Toggle | Enable high-frequency diagnostic logging (Disk I/O). |
| `maxGraphDepth` | Number | Maximum recursion depth for sub-task discovery. |
| **Mobile Actions** | Dropdowns | Configure Swipe Left/Right and Double Tap actions. |
| **Keybindings** | Custom | Remap all keyboard shortcuts. |

## 4. Target User Journeys (E2E Roadmap)

These flows represent the core value loops of the application. For a detailed, step-by-step behavioral walkthrough of these journeys with specific commands and mobile strategies, see the [User Journeys Reference](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/reference/JOURNEYS.md).

### Journey A: The Daily Setup (Dump -> Triage -> Stack) ✅
1.  **Start Dump**: Open Prompt.
2.  **Input**: Enter multiple tasks (typing + Enter).
3.  **Finish**: Type `done` and Enter.
4.  **Transition**: Verify Triage View opens.
5.  **Triage**:
    -   Swipe/Action Left (Archive): `j` or `ArrowLeft`
    -   Swipe/Action Right (Keep/Shortlist): `k` or `ArrowRight`
    -   Undo an action.
    -   Finish Triage.
6.  **Transition (Decision Phase)**:
    -   If `CurrentStack.md` exists, verify **Conflict Card** appears.
    -   Select **Merge** to append or **Overwrite** to replace.
7.  **Transition**: Verify Daily Stack View opens with the correct task set.

### Journey B: Stack Mechanics (The Workbench) ✅
1.  **Navigation**: Move focus Up (`k`) and Down (`j`).
2.  **Reorder**: Move items Up (`Shift+K`) and Down (`Shift+J`).
3.  **Timing**:
    -   Increase/Decrease duration (`f` / `d`).
    -   Toggle Anchor (`Shift+F`) on/off.
4.  **Refinement**:
    -   Rename a task (`e`).
    -   Add **New** task to stack (`c`).
    -   Add **Existing** file to stack (Command/Suggester).
5.  **Cleanup**:
    -   Archive a task (`z`).
    -   Undo (`u`) the archive.
    -   Complete a task (`x`).
6.  **Output**: Export the stack (`Shift+E`).

### Journey C: Deep Work (Files & Drilling) ✅
1.  **Contextual Load**:
    -   Open a file for Triage (`triage-file`).
    -   Open a file for Stack (`open-file-as-stack`).
2.  **Smart Import**:
    -   Add linked files from current note to stack (`add-linked-docs-to-stack`).
    -   Add a file *that has linked files* to the stack.
3.  **Drill Down**:
    -   Navigate to a task with children (linked files).
    -   Open it (Enter / Drill Down).
4.  **Rollup Logic**:
    -   Change duration of the child task.
    -   Navigate back to Main Stack (`h`).
    -   **Verify**: Parent task duration has updated to reflect the child's change.

### Journey D: Mobile Gestures ✅
1.  **Selection**: Focus a task card.
2.  **Swiping**: 
    -   Swipe Right (> 80px) to **Complete** task.
    -   Swipe Left (> 80px) to **Archive** task.
3.  **Haptics**: (Optional) Verify subtle feedback during swipe.
4.  **Double Tap**:
    -   Double tap a task card to **Toggle Anchor**.
5.  **Manual Reordering**:
    -   Long press / drag from `Drag Handle` (⠿).
    -   Move vertically and release to reorder.

### Journey E: Smart Imports (Discovery & Bulk Actions) ⏳
1.  **Preparation**:
    -   Create a note with multiple `[[Internal Links]]`.
2.  **Scanning**:
    -   Run `Add Linked Files to Stack` command.
3.  **Verification**:
    -   Ensure all linked files appear in the Daily Stack.
    -   Ensure duplicates are NOT added if already in the stack.
