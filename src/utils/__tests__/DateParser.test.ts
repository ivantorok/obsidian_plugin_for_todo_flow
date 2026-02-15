
import { DateParser } from '../DateParser';
import moment from 'moment';

describe('DateParser Defensive Coding', () => {
    test('should handle non-string inputs gracefully', () => {
        const numericInput = 12345 as any;
        const result = DateParser.parseTaskInput(numericInput);
        expect(result.title).toBe('12345');
        expect(result.startTime).toBeUndefined();
    });

    test('should handle null/undefined gracefully', () => {
        const nullInput = null as any;
        const result = DateParser.parseTaskInput(nullInput);
        expect(result.title).toBe('');
    });

    test('should still parse valid date strings', () => {
        const input = "Meeting at 2pm";
        const result = DateParser.parseTaskInput(input);
        expect(result.title).toBe('Meeting');
        expect(result.startTime).toBeDefined();
        // 2pm = 14:00
        expect(result.startTime?.hours()).toBe(14);
    });

    test('should handle numeric-looking strings', () => {
        const input = "2024";
        const result = DateParser.parseTaskInput(input);
        expect(result.title).toBe('2024');
    });
});
