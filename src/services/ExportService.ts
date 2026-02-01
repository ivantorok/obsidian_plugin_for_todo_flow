import { type TaskNode } from '../scheduler.js';

export class ExportService {
    /**
     * Formats the entire task stack into a markdown string.
     * Includes both pending and completed tasks for logging purposes.
     */
    formatExport(tasks: TaskNode[]): string {
        if (tasks.length === 0) {
            return "No tasks to export.\n";
        }

        let output = "";

        for (const task of tasks) {
            const checkbox = task.status === 'done' ? '[x]' : '[ ]';
            const timeStr = task.startTime ? task.startTime.format('HH:mm') : '--:--';
            const durationStr = task.duration ? `${task.duration}m` : '0m';
            output += `- ${checkbox} ${timeStr} [[${task.id}|${task.title}]] (${durationStr})\n`;
        }

        return output;
    }
}
