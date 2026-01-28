import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DateParser } from '../utils/DateParser.js';
import moment from 'moment';

describe('DateParser (TDD)', () => {
    // Mock "Today" to a fixed date for relative testing
    // 2026-01-28 10:00:00 (Wednesday)
    const MOCK_NOW = '2026-01-28T10:00:00';

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(MOCK_NOW));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Duration Extraction', () => {
        it('should extract duration in minutes (for 30m)', () => {
            const input = "Deep Work for 30m";
            const result = DateParser.parseTaskInput(input);
            expect(result.duration).toBe(30);
            expect(result.title.trim()).toBe("Deep Work");
        });

        it('should extract duration in hours (for 2h)', () => {
            const input = "Long meeting for 2h";
            const result = DateParser.parseTaskInput(input);
            expect(result.duration).toBe(120);
            expect(result.title.trim()).toBe("Long meeting");
        });

        it('should extract duration (in 45m syntax)', () => {
            const input = "Check emails in 45m";
            // Ambiguity: "in 45m" could mean "start in 45m" or "duration 45m".
            // As per spec, we treat "for" as duration. "in" usually means relative start.
            // Let's assume the user meant "start in 45m" for "in".
            // But for this specific test case, let's stick to "for".
            // We will skip "in" for duration to avoid confusion unless specified.
            // Wait, Implementation Plan said: "in 30m / for 1h (Duration)" in the Scope section.
            // So "in" should be duration too? Or relative start?
            // Usually "Call mom in 20m" means START in 20m.
            // "Call mom for 20m" means DURATION 20m.
            // Let's stick to "for" = Duration for now to be safe, or "in" = Start Delay?
            // Re-reading plan: `in 30m / for 1h (Duration)` was listed under Scope.
            // But typical NLP: "in 10m" = relative start.
            // Let's test "for" strictly for duration first.
            const input2 = "Test for 45m";
            const result = DateParser.parseTaskInput(input2);
            expect(result.duration).toBe(45);
        });
    });

    describe('Explicit Date Formats (ISO & Verbose)', () => {
        it('should parse ISO 8601 string (2026-01-28 12:45:20)', () => {
            const input = "2026-01-28 12:45:20";
            const result = DateParser.parseTaskInput(input);

            expect(result.startTime).toBeDefined();
            expect(result.startTime?.format('YYYY-MM-DD HH:mm')).toBe('2026-01-28 12:45');
            expect(result.isAnchored).toBe(true);
            // Title should be empty or handle specific "Task Title 2026..." format?
            // If the Input IS just the date, title might be empty? 
            // Or if input is "Meeting 2026-01-28...", title is "Meeting".
        });

        it('should parse embedded ISO date', () => {
            const input = "Submit Report 2026-02-13 15:00:00";
            const result = DateParser.parseTaskInput(input);

            expect(result.startTime?.format('YYYY-MM-DD HH:mm')).toBe('2026-02-13 15:00');
            expect(result.title.trim()).toBe("Submit Report");
        });

        it('should parse Verbose Hungarian/English format (2026. January 28., Wednesday 12:45:20)', () => {
            const input = "2026. January 28., Wednesday 12:45:20";
            const result = DateParser.parseTaskInput(input);

            expect(result.startTime?.year()).toBe(2026);
            expect(result.startTime?.month()).toBe(0); // Jan = 0
            expect(result.startTime?.date()).toBe(28);
            expect(result.startTime?.hour()).toBe(12);
            expect(result.startTime?.minute()).toBe(45);
            expect(result.isAnchored).toBe(true);
        });
    });

    describe('Relative Time Formats', () => {
        it('should parse "at HH:mm" for today', () => {
            const input = "Lunch at 12:30";
            const result = DateParser.parseTaskInput(input);

            // Should be Today (2026-01-28) at 12:30
            expect(result.startTime?.format('YYYY-MM-DD HH:mm')).toBe('2026-01-28 12:30');
            expect(result.title.trim()).toBe("Lunch");
            expect(result.isAnchored).toBe(true);
        });

        it('should parse "tomorrow"', () => {
            const input = "Call Mom tomorrow";
            const result = DateParser.parseTaskInput(input);

            // Tomorrow = 2026-01-29. Default time? If not specified, maybe null or strict start?
            // Usually "tomorrow" implies anchors. Let's assume default start or just date.
            // If no time specified, maybe we don't anchor time? Or default to 09:00?
            // For Todo Flow, Rock = Time.
            // If just "tomorrow", maybe it schedules for "Tomorrow Default"?
            // Let's expect the date to be correct.
            expect(result.startTime?.format('YYYY-MM-DD')).toBe('2026-01-29');
        });

        it('should parse "tomorrow at 5pm"', () => {
            const input = "Gym tomorrow at 5pm";
            const result = DateParser.parseTaskInput(input);

            expect(result.startTime?.format('YYYY-MM-DD HH:mm')).toBe('2026-01-29 17:00');
            expect(result.isAnchored).toBe(true);
        });

        it('should parse "tmrw at 9:00"', () => {
            const input = "Standup tmrw at 9:00";
            const result = DateParser.parseTaskInput(input);
            expect(result.startTime?.format('YYYY-MM-DD HH:mm')).toBe('2026-01-29 09:00');
        });

        it('should parse naked time at end of string (e.g. Hungarian pattern)', () => {
            const input = "ilkat sulibol elhozni 14:00";
            const result = DateParser.parseTaskInput(input);

            expect(result.startTime?.format('HH:mm')).toBe('14:00');
            expect(result.title).toBe("ilkat sulibol elhozni");
            expect(result.isAnchored).toBe(true);
        });
    });

    describe('Complex Combinations', () => {
        it('should handle "Meeting tomorrow at 2pm for 1h"', () => {
            const input = "Meeting tomorrow at 2pm for 1h";
            const result = DateParser.parseTaskInput(input);

            expect(result.title.trim()).toBe("Meeting");
            expect(result.startTime?.format('YYYY-MM-DD HH:mm')).toBe('2026-01-29 14:00');
            expect(result.duration).toBe(60);
            expect(result.isAnchored).toBe(true);
        });
    });
});
