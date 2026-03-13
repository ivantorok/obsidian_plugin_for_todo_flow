# Protocol: The Slide ("Deterministic Flow")

## Definition
"The Slide" is the core scheduling mechanic that ensures a deterministic, sequential, and overlapping-free timeline for both anchored and floating tasks.

## Mechanical Rules

### 1. The Playhead
Scheduling is driven by a virtual **Playhead**.
- The playhead starts at the **Current Time** (as provided to the scheduler).
- For each task in the list, the playhead determines its earliest possible start time.
- After a task is scheduled, the playhead advances by that task's **Total Duration**.

### 2. List Sovereignty (No Gaps)
The order of tasks in the file/list is SACRED. 
- A task later in the list CANNOT start before a task earlier in the list, even if there is a "hole" in the schedule.
- This prevents the "jumping" behavior common in traditional calendar apps, where floating tasks fill gaps, making the schedule unpredictable.

### 3. Anchored Tasks (Explicit Time)
Tasks can be **Anchored** to a specific start time.
- **Normal Flow**: If the anchored time is *after* the current playhead, the playhead jumps forward to the anchor time.
- **The Slide**: If the current playhead is *after* the anchored time (due to time passing or preceding tasks taking longer), the anchored task **SLIDES** downstream to match the playhead.
- **Sovereignty**: An anchored task never slides *upstream* (before its set time) unless explicitly un-anchored.

### 4. Floating Tasks (Implicit Time)
Floating tasks have no set start time and always start exactly at the current playhead.

### 5. Greedy Duration Rollup
The playhead always advances by the **Total Duration** of a task, which includes:
- The task's own duration.
- The recursive sum of all its children's durations.
- Subtasks contribute to the playhead advance only once (no double-counting).

## Implementation Detail
The protocol is enforced in `src/scheduler.ts` within the `computeSchedule` function.

```typescript
// THE SLIDE logic in pseudocode:
for (const task of tasks) {
    let start = task.isAnchored ? moment(task.startTime) : moment(playhead);
    
    // Enforce downstream-only movement (The Slide)
    if (start.isBefore(playhead)) {
        start = moment(playhead);
    }
    
    task.startTime = start;
    playhead = moment(start).add(task.totalDuration, 'minutes');
}
```

## Related
- [Architecture Overview](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/discovery/ARCHITECTURE.md)
- [Greedy Duration Protocol](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/discovery/GREEDY_DURATION_PROTOCOL.md)
