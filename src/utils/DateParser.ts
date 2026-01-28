import moment from 'moment';

export interface ParsedTask {
    title: string;
    startTime?: moment.Moment;
    duration?: number;
    isAnchored: boolean;
}

export class DateParser {
    static parseTaskInput(input: string): ParsedTask {
        let title = input;
        let duration: number | undefined;
        let startTime: moment.Moment | undefined;
        let isAnchored = false;

        // 1. DURATION Extraction: "for 30m", "for 2h"
        // Regex: \bfor\s+(\d+)(m|h)\b (case insensitive)
        const durationRegex = /\bfor\s+(\d+)(m|h)\b/i;
        const durationMatch = title.match(durationRegex);
        if (durationMatch && durationMatch[1] && durationMatch[2]) {
            const val = parseInt(durationMatch[1]);
            const unit = durationMatch[2].toLowerCase();
            duration = unit === 'h' ? val * 60 : val;

            // Remove from title
            title = title.replace(durationMatch[0], '').trim();
        }

        // 2. EXPLICIT DATE Formats (High Priority)

        // A. ISO 8601: "2026-01-28 12:45:20" or "2026-01-28 12:45"
        // Regex looks for YYYY-MM-DD followed by HH:mm(:ss)?
        const isoRegex = /\b(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}(:\d{2})?)\b/;
        const isoMatch = title.match(isoRegex);

        if (isoMatch && isoMatch[0]) {
            // isoMatch[0] is the full string "2026-01-28 12:45:20"
            const parsed = moment(isoMatch[0], ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm'], true);
            if (parsed.isValid()) {
                startTime = parsed;
                isAnchored = true;
                title = title.replace(isoMatch[0], '').trim();
                // Return early? Or allow duration processing (done above).
                // If explicit date found, we ignore relative "tomorrow" checks.
                const result: ParsedTask = {
                    title: title.trim(),
                    startTime,
                    isAnchored
                };
                if (duration !== undefined) result.duration = duration;
                return result;
            }
        }

        // B. VERBOSE Hungarian/English: "2026. January 28., Wednesday 12:45:20"
        // Regex: 2026. [Word] 28., [Word] 12:45(:20)?
        // We catch the whole block
        const verboseRegex = /\b\d{4}\.\s+[A-Za-z]+\s+\d{1,2}\.,\s+[A-Za-z]+\s+\d{1,2}:\d{2}(:\d{2})?\b/i;
        const verboseMatch = title.match(verboseRegex);

        if (verboseMatch && verboseMatch[0]) {
            // Moment format for: "2026. January 28., Wednesday 12:45:20"
            // Note: Moment might struggle with the complex punctuation if not exact.
            // Let's try strict matching or clean it.
            // Format: "YYYY. MMMM D., dddd HH:mm:ss"
            // "2026. January 28., Wednesday 12:45:20"
            const parsed = moment(verboseMatch[0], 'YYYY. MMMM D., dddd HH:mm:ss', false); // false = non-strict to allow flexibility?

            if (parsed.isValid()) {
                startTime = parsed;
                isAnchored = true;
                title = title.replace(verboseMatch[0], '').trim();
                const result: ParsedTask = {
                    title: title.trim(),
                    startTime,
                    isAnchored
                };
                if (duration !== undefined) result.duration = duration;
                return result;
            }
        }


        // 3. RELATIVE DATE & TIME
        // Only if no absolute date found

        const targetDate = moment(); // Start with Today
        let dateFound = false;

        // A. "Tomorrow" / "tmrw"
        const tmrwRegex = /\b(tomorrow|tmrw)\b/i;
        const tmrwMatch = title.match(tmrwRegex);
        if (tmrwMatch && tmrwMatch[0]) {
            targetDate.add(1, 'd');
            dateFound = true;
            title = title.replace(tmrwMatch[0], '').trim();
        }

        // B. "at HH:mm", "at HH:mm(am|pm)", or naked "HH:mm", "HH(am|pm)"
        // We look for:
        // 1. "at <time>"
        // 2. "<time>" if it contains a colon ":" or "am/pm"
        const timeRegex = /\b(?:at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?|(\d{1,2}):(\d{2})\s*(am|pm)?|(\d{1,2})\s*(am|pm))\b/i;
        const timeMatch = title.match(timeRegex);

        if (timeMatch && timeMatch[0]) {
            let hours = 0;
            let minutes = 0;
            let meridiem: string | undefined;

            if (timeMatch[1] !== undefined) {
                // Group 1-3: "at <hours>:<minutes><am|pm>"
                hours = parseInt(timeMatch[1]);
                minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                meridiem = timeMatch[3]?.toLowerCase();
            } else if (timeMatch[4] !== undefined) {
                // Group 4-6: "<hours>:<minutes><am|pm>" (naked with colon)
                hours = parseInt(timeMatch[4] ?? '0');
                minutes = parseInt(timeMatch[5] ?? '0');
                meridiem = timeMatch[6]?.toLowerCase();
            } else if (timeMatch[7] !== undefined) {
                // Group 7-8: "<hours><am|pm>" (naked with am/pm)
                hours = parseInt(timeMatch[7] ?? '0');
                meridiem = timeMatch[8]?.toLowerCase();
            }

            if (meridiem) {
                if (meridiem === 'pm' && hours < 12) hours += 12;
                if (meridiem === 'am' && hours === 12) hours = 0;
            }

            targetDate.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
            startTime = targetDate; // We have a specific time
            isAnchored = true;
            title = title.replace(timeMatch[0], '').trim();
        } else if (dateFound) {
            // Keep the date but default time (or just start of day)
            // If just "tomorrow", setting startTime allows test to verify date
            startTime = targetDate;
        }

        // Clean extra spaces
        title = title.replace(/\s+/g, ' ').trim();

        const result: ParsedTask = {
            title,
            isAnchored
        };

        if (startTime) result.startTime = startTime;
        if (duration !== undefined) result.duration = duration;

        return result;
    }
}
