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
        const contribution = current.originalDuration ?? current.duration;
        total += contribution;
        trace.push(`+${contribution}m from ${current.title}`);

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

export function computeSchedule(tasks: TaskNode[], currentTime: moment.Moment): TaskNode[] {
    // 1. Identify all anchored "Rocks" and resolve collisions between them (Pushing Rocks)
    // We want rocks to form a solid chain if they overlap.
    const rocks = tasks
        .filter(t => t.isAnchored && t.startTime);

    // Sort rocks effectively by their start time to process them in order
    rocks.sort((a, b) => a.startTime!.valueOf() - b.startTime!.valueOf());

    let shiftBase = moment(currentTime).subtract(10, 'years'); // effectively -infinity relative to schedule

    // Pass 1: Resolve overlaps among rocks
    for (const rock of rocks) {
        let start = moment(rock.startTime!);

        // If this rock starts before the previous rock ends, push it
        if (start.isBefore(shiftBase)) {
            start = moment(shiftBase);
            rock.startTime = start; // MUTATION: Update the task's start time in memory
        }

        const duration = rock.originalDuration ?? rock.duration;
        // Note: we use 'originalDuration' or 'duration' depending on if we want 
        // the rock to expand based on its children immediately. 
        // For now, let's assume rock duration is somewhat fixed or we use the passed duration.
        // Actually, for accurate scheduling, we might need the *calculated* duration, 
        // but circular dependency if we haven't computed it yet.
        // Simplification: Use current known duration. 
        // Ideal: Rocks are usually parents or leaves. If parents, their duration might grow.
        // But let's use the field `duration` which is passed in (and potentially stale if not re-calculated).
        // However, in the controller flow, we usually update duration *before* calling schedule.

        shiftBase = moment(start).add(duration, 'minutes');
    }

    // Rocks are now non-overlapping.
    // Re-map rocks for the collision detector
    const rockBlocks = rocks.map(t => ({
        start: moment(t.startTime!),
        end: moment(t.startTime!).add(t.originalDuration ?? t.duration, 'minutes')
    }));

    let playhead = moment(currentTime);

    // Create registry for cross-node lookups during rollup
    const registry: TaskRegistry = new Map();
    for (const t of tasks) {
        registry.set(t.id, t);
    }

    const result: TaskNode[] = tasks.map(t => {
        const ownDuration = t.originalDuration ?? t.duration;
        const { total: totalDuration, trace } = getTotalGreedyDuration(t, registry);
        return {
            ...t,
            originalDuration: ownDuration,
            duration: totalDuration,
            trace: trace,
            startTime: t.startTime ? moment(t.startTime) : undefined
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

    return result.sort((a, b) => {
        const timeA = a.startTime ? a.startTime.valueOf() : Number.MAX_SAFE_INTEGER;
        const timeB = b.startTime ? b.startTime.valueOf() : Number.MAX_SAFE_INTEGER;
        return timeA - timeB;
    });
}
