# User Journeys: Feature-Linked Reference

This document provides detailed walk-throughs of how a user interacts with the Todo Flow plugin, with direct links to the relevant features and technical implementation markers.

## 1. The Desktop "Deep Work" Morning
**The Goal:** Orchestrate a complex project from a messy brain dump.

*   **Dump Phase**: I start my coffee and hit `Cmd+P` to [Open Todo Dump](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L10). I type out ten tasks, hitting 'Enter' after each. To signal I'm finished, I [type `done`](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L87) and hit 'Enter'.
*   **Triage Phase**: The [Start Triage](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L11) view pops up. I use `k` and `j` to sort. I realize I missed a task, so I use the [Quick Add](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L28) to add a [new task](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L44) or select an [existing file](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L108). 
*   **Decision Phase**: Upon finishing triage, if a stack already exists, I am presented with a [Conflict Card](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L95) where I choose to [Merge or Overwrite](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/ARCHITECTURE.md#L54).
*   **The Workbench (Stack)**: In the [Daily Stack](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L13), I refine my day:
    *   I hit `e` to [Rename](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L46) a task to `Meeting 2pm for 1h`. [Smart NLP](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/README.md#L43) [Anchors](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L40) it.
    *   I hit `s` to [Edit Time](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L47) for a manual adjustment.
    *   I use `Shift+K/J` to [Reorder](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L38-39).
    *   I hit `Shift+Enter` to [Force Open](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L54) the task's note instead of [Drilling Down](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/README.md#L69).
    *   I hit `x` to [Complete](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L43) or `z` to [Archive](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L49) items as I go.
*   **Export & Sync**: I run [Export to Note](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L18) and use [Insert Stack at Cursor](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L27) to pull the list into my Daily Note. Later, I run [Sync Completed Tasks](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L16) which scans my note and marks tasks as [Done](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/FEATURE_INVENTORY.md#L43) if I've checkboxed them in the markdown.

---

## 2. The Mobile "Elias" Execution
**The Goal:** High-speed execution on the move using the [Lean Mobile](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/STRATEGY_LEAN_MOBILE.md) model.

*   **The Executioner (Elias 1.0)**: I'm in a high-stress environment, so I use the [Single Card Mode](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/STRATEGY_LEAN_MOBILE.md#L18). I see only my current task. I tap [DONE](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/STRATEGY_LEAN_MOBILE.md#L20) to close it and [NEXT](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/STRATEGY_LEAN_MOBILE.md#L21) to pull the next item. No gestures, just [Static Interaction](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/STRATEGY_LEAN_MOBILE.md#L22).
*   **The Adaptive Field Lead (Elias 2.0)**: 
    *   **Capture**: I have an idea on the platform and tap the [Global FAB](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/STRATEGY_LEAN_MOBILE.md#L31) to [append a raw line](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/STRATEGY_LEAN_MOBILE.md#L32) to my mobile inbox without leaving my flow.
    *   **Improvisation**: I hit an unexpected blocker, so I use the [PARK](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/STRATEGY_LEAN_MOBILE.md#L36) action to move it to my Desktop review queue without finishing it.
    *   **Awareness**: I see a [Red Shadow](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/STRATEGY_LEAN_MOBILE.md#L41) on my screen—a [collision indicator](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/STRATEGY_LEAN_MOBILE.md#L42) warning me that I'm running late for my next anchored meeting.
