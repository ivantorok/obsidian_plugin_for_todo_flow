import { describe, it, expect } from 'vitest';
import { computeSchedule, type TaskNode } from '../scheduler.js';
import moment from 'moment';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GOLDEN_PATH = path.resolve(__dirname, './fixtures/scheduler_golden.json');

describe('Scheduler Golden Master', () => {
    const scenarios = [
        {
            name: 'Basic floating sequence',
            now: '2026-02-07T09:00:00Z',
            tasks: [
                { id: 'f1', title: 'Float 1', duration: 30, isAnchored: false, status: 'todo', children: [] },
                { id: 'f2', title: 'Float 2', duration: 60, isAnchored: false, status: 'todo', children: [] }
            ]
        },
        {
            name: 'Floating tasks around a Rock',
            now: '2026-02-07T09:00:00Z',
            tasks: [
                { id: 'f1', title: 'Float 1', duration: 30, isAnchored: false, status: 'todo', children: [] },
                { id: 'r1', title: 'Rock 1', duration: 60, isAnchored: true, startTime: moment('2026-02-07T10:00:00Z'), status: 'todo', children: [] },
                { id: 'f2', title: 'Float 2', duration: 30, isAnchored: false, status: 'todo', children: [] }
            ]
        },
        {
            name: 'Rock pushing another Rock',
            now: '2026-02-07T09:00:00Z',
            tasks: [
                { id: 'r1', title: 'Rock 1', duration: 60, isAnchored: true, startTime: moment('2026-02-07T10:00:00Z'), status: 'todo', children: [] },
                { id: 'r2', title: 'Rock 2', duration: 60, isAnchored: true, startTime: moment('2026-02-07T10:30:00Z'), status: 'todo', children: [] }
            ]
        },
        {
            name: 'Parent with children duration roll-up',
            now: '2026-02-07T09:00:00Z',
            tasks: [
                {
                    id: 'p1',
                    title: 'Parent',
                    duration: 10,
                    isAnchored: false,
                    status: 'todo',
                    children: [
                        { id: 'c1', title: 'Child 1', duration: 20, isAnchored: false, status: 'todo', children: [] },
                        { id: 'c2', title: 'Child 2', duration: 30, isAnchored: false, status: 'todo', children: [] }
                    ]
                }
            ]
        },
        {
            name: 'Mixed Done and Todo tasks',
            now: '2026-02-07T09:00:00Z',
            tasks: [
                { id: 'd1', title: 'Done 1', duration: 60, isAnchored: false, status: 'done', children: [] },
                { id: 'f1', title: 'Float 1', duration: 30, isAnchored: false, status: 'todo', children: [] }
            ]
        }
    ];

    it('should match golden state', () => {
        const results = scenarios.map(s => {
            const output = computeSchedule(s.tasks as TaskNode[], moment(s.now));
            return {
                scenario: s.name,
                output: output.map(t => ({
                    id: t.id,
                    title: t.title,
                    startTime: t.startTime?.toISOString(),
                    duration: t.duration,
                    isAnchored: t.isAnchored,
                    status: t.status
                }))
            };
        });

        if (process.env.GENERATE_GOLDEN) {
            const fixturesDir = path.dirname(GOLDEN_PATH);
            if (!fs.existsSync(fixturesDir)) {
                fs.mkdirSync(fixturesDir, { recursive: true });
            }
            fs.writeFileSync(GOLDEN_PATH, JSON.stringify(results, null, 2));
            console.log(`\n[GOLDEN] Generated logic snapshot at ${GOLDEN_PATH}`);
        } else {
            if (!fs.existsSync(GOLDEN_PATH)) {
                throw new Error(`Golden file missing at ${GOLDEN_PATH}. Run with GENERATE_GOLDEN=1 to create it.`);
            }
            const golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8'));
            expect(results).toEqual(golden);
        }
    });
});
