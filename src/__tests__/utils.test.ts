import { describe, it, expect } from 'vitest';
import { formatDateRelative } from '../utils.js';
import moment from 'moment';

describe('formatDateRelative', () => {
    const now = moment('2026-01-28 10:00');

    it('should show only time if on the same day', () => {
        const sameDay = moment('2026-01-28 14:30');
        expect(formatDateRelative(sameDay, now)).toBe('14:30');
    });

    it('should show date and time if on a future day', () => {
        const nextDay = moment('2026-01-29 09:00');
        expect(formatDateRelative(nextDay, now)).toBe('2026-01-29 09:00');
    });

    it('should show date and time if on a past day', () => {
        const prevDay = moment('2026-01-27 18:00');
        expect(formatDateRelative(prevDay, now)).toBe('2026-01-27 18:00');
    });

    it('should return empty string if date is undefined', () => {
        expect(formatDateRelative(undefined, now)).toBe('');
    });
});
