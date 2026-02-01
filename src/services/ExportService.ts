import { type TaskNode } from '../scheduler.js';

export class ExportService {
    /**
     * Formats a list of tasks into a markdown string for export.
     * Only includes completed (done) tasks.
     */
    formatExport(tasks: TaskNode[]): string {
        if (tasks.length === 0) {
            return "No tasks to export.\n";
        }

        let output = "";

        for (const task of tasks) {
            const checkbox = task.status === 'done' ? '[x]' : '[ ]';
            const timeStr = task.startTime ? task.startTime.format('HH:mm') : '--:--';
            output += `- ${checkbox} ${timeStr} [[${task.id}|${task.title}]]\n`;
        }

        return output;
    }
}
