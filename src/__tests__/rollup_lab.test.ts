import { describe, it, expect } from 'vitest';
import { getTotalGreedyDuration, type TaskNode } from '../scheduler.js';

describe('Roll-up Laboratory: Comprehensive Suite', () => {

    describe('Scenario 1: Simple Hierarchy', () => {
        /**
         * n001 (10, todo)
         * n002 (20, todo)
         *   n003 (30, done)
         *   n004 (40, todo)
         *     n007 (70, done)
         *     n008 (80, todo)
         *   n005 (50, todo)
         * n006 (60, done)
         */
        const n001: TaskNode = { id: 'S1_001', title: 'n001', duration: 10, status: 'todo', isAnchored: false, children: [] };
        const n007: TaskNode = { id: 'S1_007', title: 'n007', duration: 70, status: 'done', isAnchored: false, children: [] };
        const n008: TaskNode = { id: 'S1_008', title: 'n008', duration: 80, status: 'todo', isAnchored: false, children: [] };
        const n004: TaskNode = { id: 'S1_004', title: 'n004', duration: 40, status: 'todo', isAnchored: false, children: [n007, n008] };
        const n005: TaskNode = { id: 'S1_005', title: 'n005', duration: 50, status: 'todo', isAnchored: false, children: [] };
        const n003: TaskNode = { id: 'S1_003', title: 'n003', duration: 30, status: 'done', isAnchored: false, children: [] };
        const n002: TaskNode = { id: 'S1_002', title: 'n002', duration: 20, status: 'todo', isAnchored: false, children: [n003, n004, n005] };
        const n006: TaskNode = { id: 'S1_006', title: 'n006', duration: 60, status: 'done', isAnchored: false, children: [] };

        it('note_002 should be 190 (20 + 0_scheduled + 120 + 50)', () => {
            expect(getTotalGreedyDuration(n002).total).toBe(190);
        });
        it('note_003 should be 30 (Historical display)', () => {
            expect(getTotalGreedyDuration(n003).total).toBe(30);
        });
        it('note_004 should be 120 (40 + 80)', () => {
            expect(getTotalGreedyDuration(n004).total).toBe(120);
        });
        it('note_006 should be 60 (Historical display)', () => {
            expect(getTotalGreedyDuration(n006).total).toBe(60);
        });
    });

    describe('Scenario 2: Messy Convergent Graph', () => {
        /**
         * n006 points to n009 and n010 which are shared.
         */
        const n001: TaskNode = { id: 'S2_001', title: 'n001', duration: 10, status: 'todo', isAnchored: false, children: [] };
        const n009: TaskNode = { id: 'S2_009', title: 'n009', duration: 90, status: 'todo', isAnchored: false, children: [n001] };
        const n002: TaskNode = { id: 'S2_002', title: 'n002', duration: 20, status: 'todo', isAnchored: false, children: [] };
        const n010: TaskNode = { id: 'S2_010', title: 'n010', duration: 100, status: 'todo', isAnchored: false, children: [n002] };
        const n006: TaskNode = { id: 'S2_006', title: 'n006', duration: 60, status: 'todo', isAnchored: false, children: [n009, n010] };

        it('note_006 should be 280 (60 + 100 + 120)', () => {
            // 60 + (90+10) + (100+20) = 60 + 100 + 120 = 280
            expect(getTotalGreedyDuration(n006).total).toBe(280);
        });
    });

    describe('Scenario 3: Ultra-Messy Circular Graph', () => {
        /**
         * n002 <-> n004 <-> n008 (The Circle)
         */
        const n001: TaskNode = { id: 'S3_001', title: 'n001', duration: 10, status: 'todo', isAnchored: false, children: [] };
        const n005: TaskNode = { id: 'S3_005', title: 'n005', duration: 50, status: 'todo', isAnchored: false, children: [] };
        const n002: any = { id: 'S3_002', title: 'n002', duration: 20, status: 'todo', isAnchored: false, children: [] };
        const n004: any = { id: 'S3_004', title: 'n004', duration: 40, status: 'todo', isAnchored: false, children: [] };
        const n008: any = { id: 'S3_008', title: 'n008', duration: 80, status: 'todo', isAnchored: false, children: [] };
        const n009: TaskNode = { id: 'S3_009', title: 'n009', duration: 90, status: 'todo', isAnchored: false, children: [n001] };
        const n010: TaskNode = { id: 'S3_010', title: 'n010', duration: 100, status: 'todo', isAnchored: false, children: [n002] };
        const n003: TaskNode = { id: 'S3_003', title: 'n003', duration: 30, status: 'done', isAnchored: false, children: [n009, n010] };

        n002.children = [n003, n004, n005];
        n004.children = [n002, n008];
        n008.children = [n002];

        const n006: TaskNode = { id: 'S3_006', title: 'n006', duration: 60, status: 'todo', isAnchored: false, children: [n009, n010] };

        it('The Circle {n002, n004, n008} should total 190m with n005', () => {
            // 20 + 40 + 80 + 50 = 190
            expect(getTotalGreedyDuration(n002).total).toBe(190);
            expect(getTotalGreedyDuration(n004).total).toBe(190);
            expect(getTotalGreedyDuration(n008).total).toBe(190);
        });

        it('note_003 (DONE Root) should show its roll-up for display: 420 (30 + 100 + 290)', () => {
            // 30 (self) + 100 (n009) + 290 (n010 cluster)
            expect(getTotalGreedyDuration(n003).total).toBe(420);
        });

        it('note_006 (Circular Entry) should be 450 (60 + 100 + 290)', () => {
            expect(getTotalGreedyDuration(n006).total).toBe(450);
        });
    });
});
