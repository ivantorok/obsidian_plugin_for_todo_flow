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
 * getMinDurationWithAudit: Flat sum of all unique reachable TODO nodes' own durations.
 * 
 * DESIGN DECISION:
 * We use the 'duration' field of leaf nodes because it is the active operational value
 * (updated by 'f'/'s' keys and UI edits). For intermediate nodes with children, 
 * we use 'originalDuration' (the overhead defined in the file) if present.
 */
function getMinDurationWithAudit(root: TaskNode, registry?: TaskRegistry): { total: number, trace: string[] } {
    let total = 0;
    const trace: string[] = [];
    const visited = new Set<string>();
    const queue: TaskNode[] = [root];

    while (queue.length > 0) {
        let current = queue.shift()!;

        // Resolve latest version from registry if available
        if (registry?.has(current.id)) {
            current = registry.get(current.id)!;
        }

        // Skip if already counted
        if (visited.has(current.id)) continue;
        visited.add(current.id);

        if (current.status === 'done') {
            trace.push(`Pruned ${current.title}: status is done`);
            continue;
        }

        // AUDIT RULE:
        // 1. If leaf node: use its 'duration' (active source of truth for leaf).
        // 2. If non-leaf: use 'originalDuration' if present (additional overhead).
        // This prevents double-counting because 'duration' of a parent contains its children.
        const isLeaf = !current.children || current.children.length === 0;
        const ownContribution = isLeaf ? current.duration : (current.originalDuration ?? 0);

        total += ownContribution;
        if (ownContribution > 0) {
            trace.push(`+${ownContribution}m from ${current.title}`);
        }

        // Queue children for traversal
        if (current.children) {
            for (const child of current.children) {
                queue.push(child);
            }
        }
    }

    const logMsg = `[RollupTrace] getMinDurationWithAudit for ${root.id} (${root.title}). final: ${total}`;
    if (typeof window !== 'undefined' && (window as any)._logs) (window as any)._logs.push(logMsg);
    console.log(logMsg);

    return { total, trace };
}

export function getMinDuration(root: TaskNode): number {
    return getMinDurationWithAudit(root).total;
}

export function getTotalGreedyDuration(root: TaskNode, registry?: TaskRegistry): { total: number, trace: string[] } {
    const result = getMinDurationWithAudit(root, registry);
    if (root.status === 'done') {
        result.trace.push(`Note: Status is DONE - This ${result.total}m is for display only and consumes 0m in schedule.`);
    }
    return result;
}

export function computeSchedule(tasks: TaskNode[], currentTime: moment.Moment, options?: { highPressure?: boolean }): TaskNode[] {
    const rocks = tasks.filter(t => t.isAnchored && t.startTime);
    rocks.sort((a, b) => a.startTime!.valueOf() - b.startTime!.valueOf());

    const resolvedRockTimes = new Map<string, moment.Moment>();
    let shiftBase = moment(currentTime).subtract(10, 'years');

    for (const rock of rocks) {
        let start = moment(rock.startTime!);
        if (start.isBefore(shiftBase)) {
            start = moment(shiftBase);
        }
        resolvedRockTimes.set(rock.id, start);
        const duration = rock.originalDuration ?? rock.duration;
        shiftBase = moment(start).add(duration, 'minutes');
    }

    let playhead = moment(currentTime);
    const scheduled: TaskNode[] = [];
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.isAnchored && !b.isAnchored) return -1;
        if (!a.isAnchored && b.isAnchored) return 1;
        if (a.isAnchored && b.isAnchored) {
            return (a.startTime?.valueOf() ?? 0) - (b.startTime?.valueOf() ?? 0);
        }
        return 0;
    });

    const registry: TaskRegistry = new Map(tasks.map(t => [t.id, t]));

    for (const t of sortedTasks) {
        let totalDuration = 0;
        let trace: string[] = [];
        const isLeaf = !t.children || t.children.length === 0;
        const hasChildren = t.children && t.children.length > 0;
        const shouldAudit = !options?.highPressure || isLeaf || t.originalDuration !== undefined || hasChildren;

        if (shouldAudit) {
            const audit = getTotalGreedyDuration(t, registry);
            totalDuration = audit.total;
            trace = audit.trace;
        } else {
            if (t.children && t.children.length > 0 && t.duration === 0) {
                totalDuration = 5;
            } else {
                totalDuration = t.duration;
            }
        }

        if (t.isAnchored && t.startTime) {
            const rockStart = resolvedRockTimes.get(t.id)!;
            scheduled.push({
                ...t,
                startTime: rockStart,
                duration: totalDuration,
                trace
            });
            const rockEnd = moment(rockStart).add(totalDuration, 'minutes');
            if (rockEnd.isAfter(playhead)) {
                playhead = moment(rockEnd);
            }
        } else {
            let foundSlot = false;
            while (!foundSlot) {
                foundSlot = true;
                for (const rock of rocks) {
                    const rStart = resolvedRockTimes.get(rock.id)!;
                    const rockDuration = rock.originalDuration ?? rock.duration;
                    const rEnd = moment(rStart).add(rockDuration, 'minutes');
                    const potentialEnd = moment(playhead).add(totalDuration, 'minutes');
                    if (playhead.isBefore(rEnd) && potentialEnd.isAfter(rStart)) {
                        playhead = moment(rEnd);
                        foundSlot = false;
                        break;
                    }
                }
            }
            scheduled.push({
                ...t,
                startTime: moment(playhead),
                duration: totalDuration,
                trace
            });
            playhead.add(totalDuration, 'minutes');
        }
    }

    return scheduled;
}
