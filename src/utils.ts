/**
 * Formats a duration in minutes into a human-readable string.
 * Examples: 30 -> 30m, 60 -> 1h, 90 -> 1h 30m
 */
export function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes}m`;
    }

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    if (m === 0) {
        return `${h}h`;
    }

    return `${h}h ${m}m`;
}
