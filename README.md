# Todo Flow Plugin for Obsidian

**Todo Flow** is a sophisticated "Flow-State" task manager for Obsidian. It functions like a DAW (Digital Audio Workstation) for your time, featuring a non-linear scheduler, fluid triage, and "Rock & Water" task physics.

## Core Features

### 1. The Dump 🧠
Capture thoughts instantly without friction.
- **Workflow:** Type a thought -> Press Enter -> It's saved as a file -> Input clears instantly.
- **Files:** Creates timestamped files in your target folder (e.g., `2026-01-25-0900-a1b2-MyTask.md`).

### 2. Triage (Swipe Mode) 🃏
Sort your dump into "Now" or "Later".
- **Visuals:** Swipe-card interface (Left/Right).
- **Logic:**
  - **Right (Shortlist):** Adds to your Daily Stack for today.
  - **Left (Archive/Later):** Removes from view (status remains todo or archived based on config).
- **Session:** Works on a "Tray" system. Triaging a specific set of files keeps you focused on just that batch.

### 3. The Daily Stack 🧱
A constraint-based scheduler for your Shortlisted tasks.
- **Rock & Water Physics:**
  - **Rocks (Anchored Tasks):** Commitments fixed in time (e.g., "Meeting at 14:00"). They do not move.
  - **Water (Floating Tasks):** Flexible tasks that "flow" into the available gaps between Rocks.
- **Flow State:** As you check off items or change durations, the entire timeline recalculates instantly.

## Installation

1.  Open Obsidian Settings > Community Plugins.
2.  Turn off "Safe Mode".
3.  Click "Browse" and search for "Todo Flow".
4.  Install and Enable.

*(Note: Until published, you can install manually by copying `main.js` and `manifest.json` to `.obsidian/plugins/todo-flow/`)*

## Usage Workflow

1.  **Dump:** CMD+P -> `Open Todo Flow Dump`. Capture your tasks.
2.  **Triage:** CMD+P -> `Start Triage`. Swipe right on what you want to do today.
3.  **Stack:** The Stack view opens automatically after Triage. Work through your list.

## Keybindings (Stack View)

| Key | Action | Description |
| :--- | :--- | :--- |
| `j` / `k` | **Navigate** | Move selection up or down. |
| `J` / `K` | **Reorder** | Move the selected task up or down in priority (recalculates schedule). |
| `Enter` | **Drill Down** | Enter a sub-stack (if the task has children/links). |
| `Shift`+`Enter`| **Open Note** | Open the task's note in a new pane. |
| `c` | **Create** | Insert a new task at the current position. |
| `e` | **Edit** | Rename the selected task inline. |
| `F` | **Anchor** | Toggle "Rock" mode (Fixed Start Time). |
| `Left`/`Right`| **Duration** | Decrease/Increase duration (5m, 10m, 15m, 30m, 1h...). |
| `X` | **Complete** | Mark task as Done. Prunes it from the timeline. |
| `z` | **Archive** | Remove task from the stack (status: archived) without checking it off. |
| `u` | **Undo** | Undo the last action (support for stack manipulation). |

## Settings

- **Target Folder:** Where new tasks created in "Dump" are stored.
- **Timing Mode:**
  - **Now (Dynamic):** Schedule starts from the current real-time clock.
  - **Fixed:** Schedule starts from a manually set time (e.g., 09:00).

## Commands

| Command | Description |
| :--- | :--- |
| **Open Daily Stack** | Opens the main Stack view with your shortlisted tasks. |
| **Open Todo Dump** | Opens the capture interface to dump new tasks. |
| **Start Triage** | Starts swiping through tasks in your configured Target Folder. |
| **Open Folder as Stack** | Select any folder to load its markdown files into the Stack view. Useful for project-specific sessions. |
| **Open File as Stack** | Select a note (MOC) to load all its linked tasks `[[Task]]` into the Stack view. |
| **Triage Folder** | Select any folder to start a Triage (Swipe) session for its contents. |
| **Triage File** | Select a note to Triage its linked tasks. |
| **Sync Completed Tasks** | If you are in a Markdown Export note, run this to sync "Done" status back to the original task files. |
| **Toggle Timing Mode** | Switch between "Now" (Real-time) and "Fixed" (e.g. 09:00 start) scheduling. |

---

🤖 **Built with Antigravity**
This plugin was built with Google Deepside's Antigravity agentic coding assistant.

