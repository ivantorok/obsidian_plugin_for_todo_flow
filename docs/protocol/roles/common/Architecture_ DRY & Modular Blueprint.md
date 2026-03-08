# **ARCHITECTURAL BLUEPRINT: MODULAR & DRY**

**Target:** Junior Devs / Implementation Phase

**Philosophy:** Minimalist, File-First, Logic-Centralized

To avoid "code rot" and ensure peak performance on older devices, the plugin must be built using a Service-Oriented architecture. UI views (Dump, Triage, Stack) must be "thin"—they should contain zero business logic or disk I/O code.

## **1\. THE CORE SERVICES (Logic Layer)**

### **1.1 TaskService.ts (The File Gatekeeper)**

* **Slugification Engine**: Must use string.normalize('NFC').  
  * *Regex*: Strip /\[\\\\/:\*?"\<\>|\]/g and ASCII control chars \\x00-\\x1F. Replace spaces/tabs with \-.  
  * *Constraint*: Total path (folders \+ filename \+ .md) capped at **250 characters**.  
* **Duration Parser**: Must use /^\\s\*(?:(\\d+)\\s\*h)?\\s\*(?:(\\d+)\\s\*m)?\\s\*$/i.  
  * *Normalization*: Convert all inputs to total minutes, then rewrite to YAML as XhYm (e.g., 1h30m) or Ym (e.g., 45m).  
  * *Trigger*: If parsed duration is 0, automatically set status: done.  
* **Title Resolution Hierarchy**:  
  1. YAML title field.  
  2. Link Alias \[\[Note|Alias\]\].  
  3. Link Header \[\[Note\#Header\]\].  
  4. Filename (Fallback).

### **1.2 GraphEngine.ts (The Math Processor)**

* **Recursive Rollup**: Walk links from a root .md. Each file is evaluated **once** per run to prevent circular loops.  
* **Timeline Logic**:  
  * *Floating*: StartTime \= OriginTime \+ sum(prevDurations).  
  * *Anchored*: Strictly fixed to start\_time metadata.  
  * *The Slide*: If an anchored task is "hit" by a preceding task's duration or Current Time, it retains anchored: true but slides downstream to start immediately after the obstacle finishes.  
* **Merge/Conflict Resolution (Triage \-\> Daily Stack)**:  
  1. Earlier start\_time wins.  
  2. If tied, Longer Duration wins.  
  3. If tied, lower alphabetical filename wins.  
  4. If identical (Clones), non-deterministic sorting is accepted.

### **1.3 FilePersistenceBuffer.ts (The Debouncer)**

* **Save Threshold**: Default **2000ms** (Exposed in Settings).  
* **Blur Safety**: Immediate flush() on window.blur to prevent context-switch data loss.

## **2\. THE ACTION DISPATCHER (Event Layer)**

All UI events map to one central logic path:

* ADJUST\_DURATION: UI increments/decrements. **Snapping Rule**: If value is non-standard (e.g., 22.5m), \+ jumps to next standard (30m), \- jumps to previous (15m). Ceiling: 8h (manual thereafter).  
* COMPLETE\_TASK: Sets duration to 0, triggering the TaskService state change to done.

## **3\. SHARED UI COMPONENTS (Presentation Layer)**

### **3.1 TaskListView.ts (The Universal List)**

* **DOM Contract**: Max 3 levels deep. Use data-attributes for state.  
* **Interaction Matrix**:  
  * *Vertical Swipe*: Native Scroll.  
  * *Long-Press (\~300ms)*: Lift/Drag State.  
  * *Edge Scrolling*: Automatic scroll when dragging in top/bottom 10% of screen.  
  * *Double Tap*: Open Local Menu.  
* **CSS Contract**: Vanilla CSS only. Use drop-above and drop-below border classes (2px solid) for insertion indicators. Absolutely no "ghost" DOM elements or box-shadow animations.

## **4\. DATA FLOW DIAGRAM**

1. **UI**: User Long-presses \-\> Drag State \-\> Releases on .drop-above.  
2. **Dispatcher**: Receives MOVE\_TASK(taskId, newIndex).  
3. **GraphEngine**: Recalculates the timeline for the whole stack.  
4. **UI**: Refreshes times/positions in the DOM (Immediate).  
5. **PersistenceBuffer**: Starts 2000ms timer.  
6. **TaskService**: Rewrites the link order in the stack.md file.

## **5\. REUSABILITY AUDIT**

* \[ \] Is TaskService the **only** place where app.vault.modify appears?  
* \[ \] Does GraphEngine handle the "Same File Linked Twice" rule (Double Counting accepted per calculation cycle)?  
* \[ \] Are UI button styles pulled **strictly** from Obsidian CSS variables?