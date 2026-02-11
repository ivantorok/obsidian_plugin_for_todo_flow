
import { computeSchedule, getTotalGreedyDuration } from '../src/scheduler.js';
import type { TaskNode } from '../src/scheduler.js';
import moment from 'moment';

const now = moment();

function makeTask(id: string, duration: number, children: TaskNode[] = [], status: 'todo' | 'done' = 'todo'): TaskNode {
    return {
        id,
        title: id,
        duration, // Input is "own" duration
        originalDuration: duration,
        status,
        isAnchored: false,
        children
    };
}

console.log('--- Repro: Rollup Logic ---');

// Case 1: Basic Nesting
// A (30) -> B (15) = 45
const taskB = makeTask('B', 15);
const taskA = makeTask('A', 30, [taskB]);
const result1 = computeSchedule([taskA], now);
console.log(`Case 1 (A->B): Expected 45, Got ${result1[0]!.duration}`);

// Case 2: Deep Nesting
// C (30) -> D (15) -> E (10) = 55
const taskE = makeTask('E', 10);
const taskD = makeTask('D', 15, [taskE]);
const taskC = makeTask('C', 30, [taskD]);
const result2 = computeSchedule([taskC], now);
console.log(`Case 2 (C->D->E): Expected 55, Got ${result2[0]!.duration}`);

// Case 3: Done Pruning
// F (30) -> G (15, DONE) = 30
const taskG = makeTask('G', 15, [], 'done');
const taskF = makeTask('F', 30, [taskG]);
const result3 = computeSchedule([taskF], now);
console.log(`Case 3 (F->G[Done]): Expected 30, Got ${result3[0]!.duration}`);

// Case 4: Double Counting Check (Simulate re-entrant/dirty state)
// H (30, dur=45) -> I (15)
// If we pass a task that already has duration=45 but originalDuration=30
const taskI = makeTask('I', 15);
const taskH: TaskNode = {
    ...makeTask('H', 30, [taskI]),
    duration: 100, // Garbage value, should be ignored favor of originalDuration or recalculated
    originalDuration: 30
};
const result4 = computeSchedule([taskH], now);
console.log(`Case 4 (Dirty Input): Expected 45, Got ${result4[0]!.duration}`);

console.log('--- End Repro ---');
