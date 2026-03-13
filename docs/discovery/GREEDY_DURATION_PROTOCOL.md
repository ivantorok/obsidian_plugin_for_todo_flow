# Protocol: Greedy Duration ("Recursive Rollup")

## Definition
"Greedy Duration" is the protocol for calculating the effective duration of a task node by recursively summing its own defined overhead and the durations of all reachable subtasks.

## Mechanical Rules

### 1. Total Duration Calculation
The total duration of any node $N$ is defined as:
$$Duration(N) = Overhead(N) + \sum_{C \in Children(N)} Duration(C)$$

Where:
- **Overhead(N)**: The `originalDuration` defined in the task note (defaults to 0 if children exist, or the `duration` field if it's a leaf).
- **Children(N)**: All unique tasks reachable via wikilinks in the body of task $N$.

### 2. Reachability & Uniqueness
- **Deep Traversal**: The calculation must traverse the entire sub-graph of tasks.
- **Deduplication**: Each distinct task ID is counted **exactly once** in a single roll-up calculation, even if multiple paths lead to it.
- **Cycle Protection**: Deduplication naturally prevents infinite loops in circular link structures.

### 3. State-Dependent Accounting
- **TODO vs DONE**: 
  - For **display** (Greedy Duration): All nodes contribute their full duration.
  - For **scheduling** (Min Duration): Only `todo` nodes contribute to the playhead advance. `done` nodes contribute 0m.
- **The "f" and "s" Keys**: Modifying a leaf node's duration immediately propagates upward through the graph, triggering a playhead shift in the parent stack.

### 4. Non-Destructive Graph Building
The `GraphBuilder` must never prune sub-tasks based on the parent's current status. If a parent is marked DONE, its children must still be reachable for duration display and potential recovery.

## Implementation Detail
The protocol is enforced in `src/scheduler.ts` via recursive traversal and the `TaskRegistry`.

```typescript
// Greedy Rollup logic in pseudocode:
function getMinDurationWithAudit(root, registry) {
    let total = 0;
    const visited = new Set();
    const queue = [root];

    while (queue.length > 0) {
        let current = queue.shift();
        if (visited.has(current.id)) continue;
        visited.add(current.id);

        const isLeaf = !current.children || current.children.length === 0;
        const ownContribution = isLeaf ? current.duration : (current.originalDuration ?? 0);
        
        total += ownContribution;
        // ... queue children ...
    }
    return total;
}
```

## Related
- [The Slide Protocol](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/discovery/THE_SLIDE_PROTOCOL.md)
- [Architecture Overview](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/docs/ARCHITECTURE.md)
