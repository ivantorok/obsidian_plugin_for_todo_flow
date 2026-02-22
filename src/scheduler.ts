import moment from 'moment';

export interface TaskNode {
    id: string;
    title: string;
    duration: number; // Total / Displayed duration (inc. subtasks)
    originalDuration?: number; // Own duration as defined in the file
    isAnchored: boolean;
    startTime?: moment.Moment | undefined;
    status: 'todo' | 'done';
    children: TaskNode[];
    trace?: string[]; // Audit trail for duration roll-up
    isMissing?: boolean;
    isPartial?: boolean;
    flow_state?: 'shortlist' | 'archived' | 'trash';
    _loadedAt?: number; // Timestamp of last disk load for conflict resolution
    rootPath?: string; // Original search path for cross-vault disambiguation
}

/**
 * Registry type for looking up the 'current' version of a task during traversal.
 */
type TaskRegistry = Map<string, TaskNode>;


/**
 * getMinDurationWithAudit: BFS traversal to sum reachable TODO subtasks and track reasons.
 * Uses a registry if provided to ensure it uses the most up-to-date version of a node (e.g. from the active stack).
 */
function getMinDurationWithAudit(root: TaskNode, registry?: TaskRegistry): { total: number, trace: string[] } {
    // Note: We still prune DONE children during traversal, but we allow the root to traverse 
    // its children even if the root itself is DONE (for historical roll-up display).

    let total = 0;
    const trace: string[] = [];
    const visited = new Set<string>([root.id]);
    const queue: TaskNode[] = [];

    if (root.children) {
        for (const child of root.children) {
            queue.push(child);
        }
    }

    while (queue.length > 0) {
        let current = queue.shift()!;

        // Use the registry version if available (ensures we see scaled/updated values from the same list)
        if (registry?.has(current.id)) {
            current = registry.get(current.id)!;
        }

        if (visited.has(current.id)) {
            trace.push(`Skipped ${current.title}: already visited`);
            continue;
        }

        if (current.status === 'done') {
            trace.push(`Pruned ${current.title}: status is done`);
            visited.add(current.id); // Also mark as visited to prevent re-entry from other paths
            continue;
        }

        visited.add(current.id);
        // Use originalDuration as the "own" contribution of this node.
        // If it's missing, we only trust duration if the node is a leaf (likely not a rollup).
        const contribution = current.originalDuration ?? (current.children?.length === 0 ? current.duration : 0);
        total += contribution;
        if (contribution > 0) trace.push(`+${contribution}m from ${current.title}`);

        if (current.children) {
            for (const child of current.children) {
                queue.push(child);
            }
        }
    }

    return { total, trace };
}

export function getMinDuration(root: TaskNode): number {
    return getMinDurationWithAudit(root).total;
}

export function getTotalGreedyDuration(root: TaskNode, registry?: TaskRegistry): { total: number, trace: string[] } {
    const ownDuration = root.originalDuration ?? root.duration;
    const subtaskResult = getMinDurationWithAudit(root, registry);
    const total = ownDuration + subtaskResult.total;

    const trace = [`Base: ${ownDuration}m`, ...subtaskResult.trace];
    if (root.status === 'done') {
        trace.push(`Note: Status is DONE - This ${total}m is for display only and consumes 0m in schedule.`);
    }

    return { total, trace };
}

export function computeSchedule(tasks: TaskNode[], currentTime: moment.Moment, options?: { highPressure?: boolean }): TaskNode[] {
    if (typeof window !== 'undefined') ((window as any)._logs = (window as any)._logs || []).push(`[Scheduler] computeSchedule entry. Tasks: ${tasks.length}, HighPressure: ${!!options?.highPressure}`);
    // 1. Identify all anchored "Rocks" and resolve collisions between them (Pushing Rocks)
    // We want rocks to form a solid chain if they overlap.
    const rocks = tasks
        .filter(t => t.isAnchored && t.startTime);

    // Sort rocks effectively by their start time to process them in order
    rocks.sort((a, b) => a.startTime!.valueOf() - b.startTime!.valueOf());

    const resolvedRockTimes = new Map<string, moment.Moment>();
    let shiftBase = moment(currentTime).subtract(10, 'years'); // effectively -infinity relative to schedule

    // Pass 1: Resolve overlaps among rocks
    for (const rock of rocks) {
        let start = moment(rock.startTime!);

        // If this rock starts before the previous rock ends, push it
        if (start.isBefore(shiftBase)) {
            start = moment(shiftBase);
        }

        resolvedRockTimes.set(rock.id, start);
        const duration = rock.originalDuration ?? rock.duration;
        shiftBase = moment(start).add(duration, 'minutes');
    }

    // Rocks are now non-overlapping.
    // Re-map rocks for the collision detector
    const rockBlocks = rocks.map(t => {
        const resolvedStart = resolvedRockTimes.get(t.id) || moment(t.startTime!);
        return {
            start: moment(resolvedStart),
            end: moment(resolvedStart).add(t.originalDuration ?? t.duration, 'minutes')
        };
    });

    let playhead = moment(currentTime);

    // Create registry for cross-node lookups during rollup
    const registry: TaskRegistry = new Map();
    for (const t of tasks) {
        registry.set(t.id, t);
    }

    const result: TaskNode[] = tasks.map(t => {
        // Base case: If we have children, duration is SUSPECT unless originalDuration is present.
        const ownDuration = t.originalDuration ?? ((!t.children || t.children.length === 0) ? t.duration : 0);

        let totalDuration = t.duration;
        let trace = t.trace || [];

        // OPTIMIZATION: In high-pressure mode (e.g. during a gesture), skip expensive BFS duration audits
        if (!options?.highPressure) {
            const audit = getTotalGreedyDuration(t, registry);
            totalDuration = audit.total;
            trace = audit.trace;
        } else {
            // Force a minimal duration if it's missing but has children (placeholder)
            if (t.children && t.children.length > 0 && t.duration === 0) {
                totalDuration = 5; // Minimal sensible default during jank-prevention
            }
        }

        // Use resolved rock time if it exists, otherwise use original
        const resolvedStart = resolvedRockTimes.get(t.id) || (t.startTime ? moment(t.startTime) : undefined);

        return {
            ...t,
            originalDuration: ownDuration,
            duration: totalDuration,
            trace: trace,
            startTime: resolvedStart
        };
    });

    // 2. Iterate through all tasks in their stream order
    for (let i = 0; i < result.length; i++) {
        const task = result[i]!;

        if (task.isAnchored) {
            // Rock: stays where it is. We don't move the playhead here 
            // unless we want floating tasks to always follow the last Rock they pass.
            // Actually, if a Rock exists, the playhead should probably be at least at its end
            // for any SUBSEQUENT tasks in the list.
            if (task.startTime) {
                const rockEnd = moment(task.startTime).add(task.duration, 'minutes');
                if (rockEnd.isAfter(playhead)) {
                    // playhead = rockEnd; // Optional: should water ALWAYS follow rocks in the list?
                    // User says: "fill the time before in between and after the anchored tasks according to their original order."
                    // This implies the playhead keeps moving forward, but can fill earlier gaps.
                }
            }
            continue;
        }

        // 3. Floating task: Find the first available gap that fits its duration
        let foundSlot = false;
        while (!foundSlot) {
            const start = moment(playhead);
            const effectiveDuration = task.status === 'done' ? 0 : task.duration;
            const end = moment(playhead).add(effectiveDuration, 'minutes');

            // Find any rock that overlaps with this proposed slot
            const collision = rockBlocks.find(rock =>
                (start.isBefore(rock.end) && end.isAfter(rock.start))
            );

            if (collision) {
                // If collision, jump playhead to the end of the rock and check again
                playhead = moment(collision.end);
            } else {
                // No collision! This is our slot.
                task.startTime = start;
                playhead = end;
                foundSlot = true;
            }
        }
    }

    // Use original array index as a tie-breaker for stable sort
    const withIndex = result.map((t, i) => ({ t, i }));
    withIndex.sort((a, b) => {
        const timeA = a.t.startTime ? a.t.startTime.valueOf() : Number.MAX_SAFE_INTEGER;
        const timeB = b.t.startTime ? b.t.startTime.valueOf() : Number.MAX_SAFE_INTEGER;
        if (timeA !== timeB) return timeA - timeB;
        return a.i - b.i;
    });

    return withIndex.map(x => x.t);
}
