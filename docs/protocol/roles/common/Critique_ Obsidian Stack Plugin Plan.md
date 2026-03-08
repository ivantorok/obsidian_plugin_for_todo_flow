# **RUTHLESS ARCHITECTURAL CRITIQUE**

**Target Audience:** Junior Devs / TDD Implementation

**Status:** FULLY DEFINED / TDD-READY

This specification now provides the deterministic rules required for Test-Driven Development. A junior coder can write assertions (expect(output).toEqual(expected)) based on these strict definitions.

Below are the resolved architectural rules categorized by domain.

## **1\. FATAL LOGICAL FLAWS: Graph Traversal & Timeline Math**

These are algorithmic black holes. A junior dev cannot write a unit test for these because the correct answers are not defined.

* ![][image1]The Shared Child Node Paradox: Node A and Node B are both in the Stack. Both link to Node C (duration: 30m).  
  * *The resolved logic:* Double counting is explicitly accepted. A "calculation cycle" is defined as the evaluation of a *single* root item in the Stack View. If there are multiple items in the Stack View, there are multiple separate calculation runs. Therefore, Task C's duration is added to *both* Task A and Task B independently.  
* ![][image1]The Overlap Void: Origin Time is 10:00. Floating Task A (Duration: 45m). Anchored Task B (Start: 10:30, Duration: 30m).  
  * *The resolved logic:* The timeline explicitly permits "dead zones" or gaps. In this scenario, Task A gets pushed to start entirely *after* Task B (at 11:00), leaving a 30-minute empty gap from 10:00 to 10:30. Tasks are never automatically split. It remains the user's responsibility to manage their fixed/floating obligations and manually resolve these gaps utilizing the tool's fast calculations and reordering capabilities.  
* ![][image1]The "Current Time" Collision: Origin time is "Current Time" (updating every minute). Floating Task A is 30m long. It is now 10:15. Task A is not marked done.  
  * *The resolved logic:* Yes, the schedule keeps sliding forward infinitely. Unanchored tasks flow around anchored ones and slide forward with the current time. Anchored tasks remain fixed *unless* the current time hits them; once the current time overtakes an anchored task, it is pushed forward as well. If this pushed anchored task collides with *another* anchored task downstream, it pushes that one too. To prevent mathematical impossibilities, the user is strictly forbidden from manually setting start times that create overlaps (this triggers an error message and the action is blocked).

## **2\. VAGUE DATA DEFINITIONS (Schema & Parsers)**

TDD requires exact Regex and schema validation rules.

* ![][image1]"Any existing markdown file can be decorated" (Task Definition):  
  * *The resolved logic:* The plugin uses lazy evaluation and graph traversal, eliminating vault-wide O(N) scanning. A "Task" is strictly defined as an .md file that is actively loaded into a Stack View (either manually added, sent via Triage) OR stumbled upon during the downstream graph traversal of links from a loaded task. If a file is not in the active stack's tree, it is completely ignored and not parsed.  
* ![][image1]\<4\_CHAR\_RANDOM\> & \<SLUGIFIED\_TITLE\>  
  * *The resolved logic:* The character set allows **UTF-8** to support international users, but requires strict sanitization.  
    * **Slugification Rules:** 1\. String must be normalized to NFC (string.normalize('NFC')) to prevent macOS vs Windows sync conflicts.  
      2\. Strip all reserved filesystem characters using Regex: /\[\\\\/:\*?"\<\>|\]/g.  
      3\. Strip ASCII control characters (\\x00-\\x1F).  
      4\. Replace spaces and tabs with hyphens (-).  
    * **Path Limits:** To ensure safe syncing and avoid OS-level path errors (especially on Windows), the total constructed file path (folder path \+ filename \+ .md extension) is capped at a strict limit of 250 characters.  
* ![][image1]duration: Any valid hour/minute value (e.g., 12m, 1h45m)  
  * *The resolved logic:* Parsing is highly forgiving, utilizing the Regex: /^\\s\*(?:(\\d+)\\s\*h)?\\s\*(?:(\\d+)\\s\*m)?\\s\*$/i.  
    * **Normalization:** All valid inputs (e.g., 90m, 1h 30m, 1H30M) are parsed into total minutes, and then strictly rewritten back to the frontmatter in the standard format XhYm (e.g., 1h30m) or Ym (e.g., 45m).  
    * **The Zero-Duration Rule:** If the parsed duration equals 0 (e.g., 0m, 0h, 0h0m), the application does *not* crash. Instead, this acts as a state machine trigger: the task's duration is removed from the rollup, and its status is automatically updated to status: done.  
* ![][image1]**"Snap to the closest meaningful value"**  
  * *The resolved logic:* Manual text input is always respected. If a user explicitly types a non-standard value like 22.5m or 43m, it is parsed, saved, and calculated exactly as entered. The "snapping" logic is strictly a UI interaction rule for the increment/decrement (+/-) buttons.  
    * If the current value is not in the predefined list (e.g., 22.5m) and the user presses \+, it jumps to the next highest predefined value (30m).  
    * If the user presses \-, it jumps to the next lowest predefined value (15m).  
    * **Ceiling Bypass:** The predefined list stops at 8h. If a duration is greater than 8h, the snapping list is bypassed entirely, and the UI buttons just add/subtract a standard flat interval (e.g., \+/- 30m) to the custom duration.  
* ![][image1]**"Standard Obsidian links"**  
  * *The resolved logic:* All standard link types (\[\[Note\]\], \[\[Note|Alias\]\], \[\[Note\#Header\]\], and \[Markdown\](note.md)) are parsed.  
    * **Scope and Deduplication:** The target is *always* the entire .md file, regardless of if a specific header block was linked. If a file is linked multiple times within the files being parsed for a specific calculation cycle, it is deduplicated and evaluated only once per run.  
    * **Title Resolution Hierarchy:** The task name displayed in the UI is derived using the following strict order of preference:  
      1. **Metadata:** The title field in the target .md file's YAML frontmatter.  
      2. **Alias:** The alias provided within the link (e.g., \[\[Note Name|Alias\]\]).  
      3. **Header:** The specific header referenced in the link (e.g., \[\[Note Name\#Header\]\]).  
      4. **Filename:** The standard file name (fallback).

## **3\. MISSING STATE MACHINES (TDD Blockers)**

* ![][image1]**The "Unprocessed Pool" (Dump Phase)**  
  * *The resolved logic:* The Dump phase is strictly persistent, writing to disk immediately to prevent data loss. When a user submits a thought during the Dump phase, two distinct file I/O operations occur:  
    1. A new atomic task .md file is immediately generated using the standard naming convention and defaults.  
    2. A link to that newly created file is appended to a running dump.md file.  
    * Therefore, the "Unprocessed Pool" is not a volatile memory array, but rather the physical dump.md file itself. Transitioning to the Triage phase simply means handing over this dump.md file for parsing.  
* ![][image1]**"Ghost Notes Concept" (todaystack.md / currentstack.md)**  
  * *The resolved logic:* The confusing "Ghost Notes" terminology is deprecated. The architecture strictly separates **Stack Files** (literal .md files on disk) from **Stack Views** (the in-memory UI rendering).  
    * **Literal Files Ensure Sync:** todaystack.md is a literal .md file on the disk to ensure seamless cross-device synchronization via Obsidian Sync.  
    * **No currentstack.md exists:** When a user drills down 3 levels deep, they are simply opening a specific atomic task .md file inside a **Stack View**.  
    * **Performance vs. Persistence (Debounce Strategy):** To prevent destroying the SSD with constant writes during drag-and-drop, the Stack View operates on an **in-memory DOM state**. Changes instantly update the UI but mark the state as "dirty." The plugin commits the dirty state to the literal .md file *only* when:  
      1. A debounce timer expires (e.g., 2000ms after the last UI interaction).  
      2. A "blur" event occurs (the user switches to another note, closes the app, or backgrounds Obsidian).  
    * **Exporting:** If a user wishes to export a deeply nested view, they trigger an "Export" command. The plugin reads the current in-memory state of the active Stack View and dumps it into a newly generated file (e.g., export\_YYYYMMDD\_TaskName.md).  
* ![][image1]**Trigger Optimization (Graph Recalculation)**  
  * *The resolved logic:* For the MVP (Minimum Viable Product), automatic background graph traversal is explicitly deferred to avoid caching complexities and CPU overhead. Graph recalculation is strictly a **manual, user-initiated action**.  
    * **Triggers:** The junior dev must wire the recalculation engine to three explicit command surfaces:  
      1. An option in the Mobile Local Menu (Long-press task \-\> Recalculate).  
      2. An Obsidian Command Palette action (e.g., todo-flow: recalculate-stack).  
      3. A configurable Desktop keyboard shortcut.  
    * *Future-proofing:* The core graph traversal math must be written as an isolated pure function (e.g., calculateStack(rootNode)). This ensures that in future iterations, this exact function can be effortlessly wired to automatic Obsidian API events without rewriting any internal logic.  
* ![][image1]**Merge "Shortlist" to Daily Stack**  
  * *The resolved logic:* Merging is handled via a strict split-logic algorithm to protect timeline integrity:  
    1. **Floating Tasks:** All unanchored tasks from the Shortlist are simply appended to the **bottom** of the Daily Stack.  
    2. **Anchored Tasks:** Incoming anchored tasks are inserted into the stack at their chronological start\_time position.  
    3. **The Collision Rule (Tie-Breaker):** If an incoming anchored task overlaps with an *existing* anchored task in the Daily Stack, the system applies the following deterministic tie-breaker to decide which task holds its ground:  
       * *Check 1:* Earlier Start Time wins.  
       * *Check 2:* If start times are equal, Longer Duration wins.  
       * *Check 3:* If durations and start times are equal, lower alphabetical filename (older task) wins.  
       * *The Identical Clone Clause (Accepted Non-Determinism):* If two completely distinct files somehow have identical metadata and identical filenames (e.g., residing in different folders), the engine explicitly allows non-deterministic sorting. Tests should simply assert that one wins and one is pushed (\[A, B\] or \[B, A\]), preventing brittle over-engineering.  
    * **The Slide (Resolution):** The "loser" of the tie-breaker does *not* lose its anchor. Instead, it retains its anchored: true state but is dynamically pushed downstream ("slides") to start immediately after the winning task finishes. This perfectly mirrors the established behavior of anchored tasks naturally pushing each other when squeezed by the Current Time.

## **4\. UI/UX "MAGIC" (Implementation Black Holes)**

* ![][image1]**"Vertical swipes act as invisible drag-and-drop handles"**  
  * *The resolved logic:* The UI completely abandons complex modal states (like "Enter Reorder Mode") and invisible drag handles. Instead, it uses a strict, deterministic **Interaction Matrix** optimized for mobile:  
    * **Vertical Swipe:** Always natively scrolls the list.  
    * **Horizontal Swipe:** Triggers Archive/Complete (Configurable).  
    * **Single Tap:** Simply selects the task (highlights it). It does *not* accidentally open the detailed view.  
    * **Double Tap:** Opens the Local Context Menu for the task.  
    * **Long-Press (Hold) & Ultra-Light Dragging:** To ensure peak performance on older Androids, dragging uses a strictly flat DOM and simple CSS class toggling.  
      * *The Lift:* After holding for \~300ms, the dragged task simply receives opacity: 0.5 and a basic background color swap. No expensive box-shadows or z-index DOM detachments.  
      * *The Destination Indicator (Solid Insertion Line):* As the user drags their finger over the list, the engine calculates if the touch point is on the top half or bottom half of the hovered task. It dynamically applies a .drop-above or .drop-below CSS class to the hovered task, which renders a solid 2px border on the top or bottom. This prevents expensive DOM element injections (no "ghost placeholders").  
      * *Edge Scrolling:* Moving the dragged task into the top/bottom 10% of the screen triggers automatic container scrolling.  
      * *Release:* The task drops into the indicated slot. The DOM array is updated in-memory, all .drop-above/.drop-below CSS classes are cleared, and Drag State exits immediately.  
    * **Local Menu Exit Strategy:** Selecting "Undo" or "Redo" executes the action but explicitly keeps the Local Menu open for rapid sequential adjustments. Selecting any other action (e.g., "Open Detailed View", "Export") executes the action and immediately closes the menu.  
* ![][image1]**"Highly flattened DOM structures" (Anti-Bloat Guardrails)**  
  * *The resolved logic:* To guarantee peak rendering performance on older hardware, the developer is strictly forbidden from using UI component libraries (no Tailwind, no Framer Motion) or trendy styling (no glassmorphism, no backdrop-filter, no box-shadow animations). The plugin must use vanilla DOM manipulation with a strict layout contract.  
  * **The DOM Contract:** The HTML hierarchy for the Stack View may not exceed 3 levels deep inside the \<ul\>. It must match this exact semantic structure:  
    \<ul class="todo-flow-stack"\>  
      \<\!-- Data attributes store state, preventing constant JS object lookups \--\>  
      \<li class="task-row" data-id="2026..." data-status="todo" data-anchored="true"\>  
         \<span class="task-time"\>10:00\</span\>  
         \<span class="task-duration"\>30m\</span\>  
         \<span class="task-title"\>Buy milk\</span\>  
      \</li\>  
    \</ul\>

  * **The CSS Contract:** 1\. Only use CSS Grid or Flexbox on the .task-row for horizontal alignment.  
    2\. Absolutely no wrapper \<div\> elements just for layout grouping.  
    3\. UI styling must solely rely on Obsidian's native CSS variables (e.g., var(--background-primary), var(--text-normal)) to ensure native theme compatibility without custom heavy stylesheets.  
* ![][image1]**Debounce mechanism (Disk I/O Optimization)**  
  * *The resolved logic:* To protect the device's storage and ensure UI fluidity, in-memory state changes are committed to the literal .md file using a strict debounce and blur strategy:  
    1. **The Threshold:** The default debounce timer is 2000ms (2 seconds). This value must be exposed in the Obsidian Plugin Settings so users can adjust it to fit their device's hardware constraints.  
    2. **The Blur Safety Net:** Regardless of the debounce timer, the plugin must immediately force a disk write if a window.blur event fires (e.g., the user switches to another pane, backgrounds the app, or locks their screen). This guarantees zero data loss during context switches.

## **5\. ACTIONABLE REQUIREMENTS FOR THE NEXT ITERATION**

**NONE.** The core architecture, data schemas, mathematical resolutions, and UI interaction matrices are fully defined. The specification is officially ready for a developer to begin Test-Driven Development.

[image1]: <data:image/png;base64,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>