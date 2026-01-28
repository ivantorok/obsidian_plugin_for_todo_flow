# Media Production Guide for Todo Flow

**Goal:** Create high-quality visual assets (GIFs/Images) for the `README.md` to pass Obsidian Community Plugin review.

## 1. Preparation

Before you start recording:

*   **Theme:** Switch to the **Default Obsidian Theme** (Dark Mode is usually preferred for dev tools, but Light is fine if it looks cleaner).
    *   *Why?* Custom themes distract from the plugin's UI.
*   **Window Size:** Resize your Obsidian window to a focused size (e.g., about 1000px wide). Avoid full-screen 4K recordings; they are unreadable on mobile.
*   **Clean Vault:** Create a dedicated folder (e.g., `Demo`) to keep the file list clean.
*   **Recording Tool:** Use **OBS Studio** or **QuickTime** (Mac) / **SimpleScreenRecorder** (Linux).
    *   **Format:** Record in MP4. You can convert to GIF later (e.g., using `ffmpeg` or ezgif.com).
    *   **Mouse:** Ensure your mouse cursor is visible.

---

## 2. Shot List & Scripts

### Scene A: The Brain Dump (Speed)
**Goal:** Show how fast it is to capture thoughts.
1.  **Start Recording.**
2.  Press `Cmd/Ctrl + P` -> Type "Dump" -> Select "Open Todo Flow Dump".
3.  **Action:** Type rapidly:
    *   "Buy milk" [Enter]
    *   "Call John about project" [Enter]
    *   "Schedule dentist" [Enter]
4.  Notice how the input clears instantly and files appear in the background.
5.  **Stop Recording.**
6.  *Save as:* `demo-dump.mp4`

### Scene B: Triage (Swipe Logic)
**Goal:** Show the "Now vs Later" decision flow.
1.  **Start Recording.**
2.  Press `Cmd/Ctrl + P` -> Select "Start Triage".
3.  **Action:**
    *   **Card 1 ("Buy milk"):** Press `Right Arrow` (Keep/Shortlist).
    *   **Card 2 ("Call John"):** Press `Right Arrow` (Keep).
    *   **Card 3 ("Schedule dentist"):** Press `Left Arrow` (Later/Archive).
4.  Show the "Triage Complete" message or the transition to the Stack.
5.  **Stop Recording.**
6.  *Save as:* `demo-triage.mp4`

### Scene C: The Daily Stack (Flow & Physics)
**Goal:** Show reordering, anchoring, and time calculation.
1.  **Prerequisite:** Have 3-4 tasks in your Stack.
2.  **Start Recording.**
3.  **Action 1 (Reorder):** Select the middle task. Press `Shift + K` (Move Up). *Pause to show the time/schedule updating.*
4.  **Action 2 (Duration):** Press `Right Arrow` on a task to increase duration (e.g., 30m -> 45m). *Show expected start times shifting down.*
5.  **Action 3 (Anchor):** Press `F` on a task. *Show the "Anchor" icon appear.*
6.  **Stop Recording.**
7.  *Save as:* `demo-stack.mp4`

### Scene D: Drill Down (Deep Work)
**Goal:** Show hierarchy and focus navigation.
1.  **Prerequisite:** One task should have a link/subtask (or just be a file).
2.  **Start Recording.**
3.  Select a task.
4.  **Action:** Press `Enter`.
5.  Screen clears to show the sub-task (or blank state if new).
6.  **Action:** Press `c` (Create) -> Type "Subtask 1" [Enter].
7.  **Action:** Press `h` (or your configured Go Back key) to return to the main list.
8.  **Stop Recording.**
9.  *Save as:* `demo-drilldown.mp4`

---

## 3. Post-Production & Saving

1.  **Format:** Convert your MP4s into optimized GIFs (max width 800px, < 5MB each).
    *   *Tip:* `ffmpeg -i input.mp4 -vf "fps=10,scale=800:-1:flags=lanczos" -c:v gif output.gif`
2.  **Location:**
    *   Create a folder in your repo: `assets/` (or `images/` - checked repo, creating `assets/`).
    *   Move the final GIFs there.
3.  **Integration:**
    *   We will link them in `README.md` like this: `![Brain Dump Demo](assets/demo-dump.gif)`

---

**Next Step:** Copy these assets to your repo folder. I will then help you commit them and link them in the README.
