# **Obsidian "Stack" Plugin Specification (Working Title)**

## **1\. Overview**

A time-blocking and task triage Obsidian plugin designed around a three-phase workflow: **Dump, Triage, and Stack**. It treats individual Obsidian Markdown files as atomic tasks, using note links to create dynamic subtask hierarchies with roll-up time estimations.

## **2\. Data Model: The Atomic Task**

Every task is an individual Obsidian Markdown (.md) file. Any existing markdown file can be decorated to become a task.

**File Naming Convention:**

\<YYYYMMDDHHMMS\>-\<4\_CHAR\_RANDOM\>-\<SLUGIFIED\_TITLE\>.md

*Example: 20260308111441-abcd-buy-milk.md*

**Metadata (YAML Frontmatter):**

If a file is treated as a task, it defaults to the following if undefined:

* duration: 30m  
* anchored: false  
* status: todo

*Schema:*

* title: (String) e.g., "buy milk"  
* status: (Enum) \[todo, done\]  
* duration: (String/Time Format) Any valid hour/minute value (e.g., 12m, 1h45m). *Note: While the data can be any value, UI controls for incrementing/decrementing will snap to the closest meaningful value from this predefined list: \[2m, 5m, 10m, 15m, 30m, 45m, 1h, 1h30m, 2h, 3h, 4h, 5h, 6h, 7h, 8h\].*  
* anchored: (Boolean) \[true, false\]  
* start\_time: (Time String) e.g., 11:45. *Only applicable if anchored: true.*

**Hierarchy (Subtasks):**

Subtasks are simply standard Obsidian links (\[\[...\]\] or markdown links) present within the body of the task note.

## **3\. Core Engine: Time & Duration Logic**

### **3.1 Greedy Rollup Duration Calculation**

The duration displayed in the Stack View is a dynamically calculated value.

* **Formula:** Task Duration \= Own Duration \+ Sum(Linked 'Todo' Tasks Durations)  
* **Graph Traversal:** The calculation walks downstream through all linked files.  
* **Circular Reference Safety:** Each node (task) is evaluated exactly **once** per calculation cycle to prevent infinite loops from circular references. This will be implemented in-memory using an efficient queueing mechanism designed to be resource-friendly.  
* **Trigger Optimization:** Graph traversal is computationally expensive. It will *not* run continuously. It should only trigger when there is a high probability the graph has changed (e.g., note links are added/removed, a task's duration is edited, or a task is marked complete/archived).  
* **Exclusions & Pass-Through:** A task with status: done contributes 0 to the duration sum. However, the traversal **does not stop** at a completed task; the engine "passes through" it. Its linked child tasks are still evaluated, and their durations are rolled up into the total (provided those children are not 'done' themselves).

### **3.2 Stack Scheduling (The Timeline)**

Tasks are laid out linearly from top to bottom.

* **Origin Time:** Defined in settings as either Current Time (e.g., ticking forward) or a Fixed Start Time (e.g., 09:00). *If set to Current Time, the plugin will check and update the timeline UI automatically every 1 minute.*  
* **Floating Tasks:** Start time \= Origin Time \+ Calculated Duration of all preceding tasks.  
* **Anchored Tasks & Overlap Logic:** Start time is strictly frozen to the start\_time metadata. If a preceding floating task's duration increases and causes it to overlap with an anchored task, the floating task is dynamically pushed to start *after* the anchored task. If the floating task's duration is later reduced so that it fits again, it reverts to its original chronological position before the anchored task.

## **4\. Workflows & Views**

### **Phase 1: Dump**

* **Purpose:** Frictionless quick capture.  
* **UI/UX:** Keyboard-focused entry. Rapidly create new atomic task files, which are dumped into an "unprocessed" pool.  
* **Completion:** The Dump phase ends, and automatically transitions to Triage, when the user types done as a task and presses Enter, or when they manually press a "Next Thought" / "Done" UI button.

### **Phase 2: Triage**

* **Purpose:** Sorting the dumped items into actionable lists.  
* **Entry Points:** \* *Default:* Starts from the unprocessed "Dump" pool.  
  * *Note Context:* Can be initiated on a specific note (triages all notes linked within it).  
  * *Folder Context:* Can be initiated on a folder (triages all notes inside the folder).  
* **Actions:** \* Categorize into "Shortlist" or "Later".  
  * **Add Item:** A unified feature shared identically with the Stack View. Utilizes a vault-wide fuzzy search to find existing notes or force-create brand new ones.  
* **Resolution:** Merge the "Shortlist" into the existing Daily Stack, or create a brand new Stack from it.

### **Phase 3: Stack View (Main View)**

* **Purpose:** Executing the day.  
* **Row Format:** \[Start Time\] \[Calculated Duration\] \[Title\] (e.g., \[07:33\] \[1h30m\] \[buy milk\]).  
* **Capabilities (Desktop):** Reorder tasks, adjust duration, toggle anchor state, toggle done state, manually set start time (if anchored), **edit task name directly**, drill down into Detailed View or Substack View. *(Note: Mobile capabilities differ, prioritizing touch gestures).*

### **Detailed View & Infinite Drill-Down (Substacks)**

* **Purpose:** Granular control and navigating hierarchies.  
* **Ghost Notes Concept:** The plugin utilizes specific "ghost notes" as viewports:  
  * todaystack.md: The highest tier stack for the given day.  
  * currentstack.md: The actively displayed contextual view.  
* **Navigation:** An atomic task can be viewed as a Stack or as Details. Users can drill down infinitely (Stack \-\> Detailed \-\> Stack \-\> Detailed...) depending on the links within the notes, and navigate back up the chain seamlessly.

## **5\. UI Architecture & Technical Constraints**

* **Performance First:** The UI must be optimized heavily for older Android devices.  
* **DOM & Styling:** Utilize highly flattened DOM structures and very basic, minimal CSS to prevent rendering bottlenecks.  
* **Minimalist Design:** Assume power-user knowledge. Do not waste pixels on unnecessary UI chrome like the standard six-dot drag handles.  
* **Obsidian Integration:** Heavily utilize the Obsidian Command Palette and plugin settings for configuration and edge-case actions, keeping the primary UI uncluttered.  
* **Mobile Gestures:** Explicit care must be taken to decouple the plugin's custom touch gestures (swipes, long presses) from default Obsidian UI behaviors and native Android OS gestures.  
* **State Management (Memory vs. Disk):** Carefully balance in-memory operations versus file saves. High-frequency actions (like dragging tasks or typing) should be handled in memory and committed to the markdown files (like currentstack.md or task frontmatter) via a debounce mechanism or explicit state changes to minimize disk I/O.

## **6\. Platform-Specific Interactions**

### **Desktop (Keyboard-Centric)**

Customizable hotkeys. Proposed defaults:

* **Navigation:** Arrow keys, j/k, d/f  
* **Actions:** \* a: Add task  
  * c: Complete task  
  * F: Toggle Anchor (Freeze)  
  * Enter / Shift+Enter: Open in specific views (Detailed vs. Substack)

### **Mobile (Touch-Centric)**

* **Dump:** Auto-focus keyboard for rapid text entry.  
* **Triage:** \* Swipe to sort (Shortlist vs. Later).  
  * Buttons: "Shortlist All", "Add Item" (unified with Stack View).  
  * End-of-queue swipe: "Create New Stack" or "Merge to Daily Stack".  
* **Stack:**  
  * *Vertical Scroll:* Navigate the list.  
  * *Horizontal Swipe:* Archive (Left) / Complete (Right) (Configurable).  
  * *Single Tap:* Select task.  
  * *Double Tap:* Undo last action.  
  * *Long Press:* Opens Local Context Menu (Toggle Anchor, Enter Reorder Mode, Open Detail View, Add New Task, Export Stack to file).  
  * *Reorder Mode:* Vertical swipes act as invisible drag-and-drop handles for the selected task (no visible drag dots).  
* **Detailed View:** Keyboard for title/time editing. Big touch targets (buttons) for Duration, Anchor, Status, Archive, and "Open as Stack".

## **7\. Resolved Mechanisms**

1. **Archiving:** Archiving a task means removing its link/reference from currentstack.md or todaystack.md. Once removed, it is no longer part of the active context and drops out of the greedy rollup calculations.  
2. **Export:** Exporting a stack from the mobile menu (or elsewhere) generates a standalone markdown file utilizing the standard naming convention, e.g., export\_YYYYMMDDHHMMS\_abcd.md.