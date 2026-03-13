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
function getMinDurationWithAudit(root: TaskNode, registry?: TaskRegistry, includeDone: boolean = false): { total: number, trace: string[] } {
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

        if (current.status === 'done' && !includeDone) {
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
    if (typeof window !== 'undefined') console.log(logMsg);
    console.log(logMsg);

    return { total, trace };
}

export function getMinDuration(root: TaskNode, includeDone: boolean = false): number {
    return getMinDurationWithAudit(root, undefined, includeDone).total;
}

export function getTotalGreedyDuration(root: TaskNode, registry?: TaskRegistry, includeDone: boolean = false): { total: number, trace: string[] } {
    const result = getMinDurationWithAudit(root, registry, includeDone);
    if (root.status === 'done') {
        result.trace.push(`Note: Status is DONE - This ${result.total}m is for display only and consumes 0m in schedule.`);
    }
    return result;
}

export function computeSchedule(tasks: TaskNode[], currentTime: moment.Moment, options?: { highPressure?: boolean }): TaskNode[] {
    const scheduled: TaskNode[] = [];
    let playhead = moment(currentTime);

    const registry: TaskRegistry = new Map(tasks.map(t => [t.id, t]));

    // Iterate through tasks in their original list order (Sovereign UX)
    for (const t of tasks) {
        let totalDuration = 0;
        let trace: string[] = [];
        const isLeaf = !t.children || t.children.length === 0;
        const hasChildren = t.children && t.children.length > 0;
        const shouldAudit = !options?.highPressure || isLeaf || t.originalDuration !== undefined || hasChildren;

        if (shouldAudit) {
            const audit = getTotalGreedyDuration(t, registry, true); // Always include DONE for the object's own duration display
            totalDuration = audit.total;
            trace = audit.trace;
        } else {
            if (t.children && t.children.length > 0 && t.duration === 0) {
                totalDuration = 5;
            } else {
                totalDuration = t.duration;
            }
        }

        const scheduledDuration = t.status === 'done' ? 0 : totalDuration;

        if (t.isAnchored && t.startTime) {
            // THE SLIDE: Anchored tasks slide downstream if hit by the playhead.
            let start = moment(t.startTime);
            if (start.isBefore(playhead)) {
                start = moment(playhead);
            }
            
            scheduled.push({
                ...t,
                startTime: start,
                duration: totalDuration,
                trace
            });
            playhead = moment(start).add(scheduledDuration, 'minutes');
        } else {
            // FLOATING: Always starts at the current playhead.
            scheduled.push({
                ...t,
                startTime: moment(playhead),
                duration: totalDuration,
                trace
            });
            playhead.add(scheduledDuration, 'minutes');
        }
    }

    return scheduled;
}
