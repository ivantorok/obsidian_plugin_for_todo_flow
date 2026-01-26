import { describe, it, expect } from 'vitest';
import { formatKeys, parseKeys } from '../utils/settings-utils.js';

describe('Settings UI Utils', () => {
    describe('formatKeys', () => {
        it('should join single key', () => {
            expect(formatKeys(['h'])).toBe('h');
        });

        it('should join multiple keys with comma and space', () => {
            expect(formatKeys(['h', 'ArrowLeft'])).toBe('h, ArrowLeft');
        });

        it('should return empty string for empty array', () => {
            expect(formatKeys([])).toBe('');
        });

        it('should return empty string for undefined/null', () => {
            expect(formatKeys(undefined as any)).toBe('');
            expect(formatKeys(null as any)).toBe('');
        });
    });

    describe('parseKeys', () => {
        it('should parse single key', () => {
            expect(parseKeys('h')).toEqual(['h']);
        });

        it('should parse multiple keys separated by comma', () => {
            expect(parseKeys('h, ArrowLeft')).toEqual(['h', 'ArrowLeft']);
        });

        it('should handle flexible whitespace', () => {
            expect(parseKeys(' h ,   ArrowLeft ')).toEqual(['h', 'ArrowLeft']);
        });

        it('should filter out empty entries', () => {
            expect(parseKeys('h,, , ArrowLeft')).toEqual(['h', 'ArrowLeft']);
        });

        it('should return empty array for empty string', () => {
            expect(parseKeys('')).toEqual([]);
            expect(parseKeys('   ')).toEqual([]);
        });
    });
});
