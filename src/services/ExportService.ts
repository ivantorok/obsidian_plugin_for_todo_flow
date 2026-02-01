import { type TaskNode } from '../scheduler.js';

export class ExportService {
    /**
     * Formats a list of tasks into a markdown string for export.
     * Only includes completed (done) tasks.
     */
    formatExport(tasks: TaskNode[]): string {
        const completedTasks = tasks.filter(t => t.status === 'done');

        if (completedTasks.length === 0) {
            return "No completed tasks to export.\n";
        }

        let output = `## Exported Tasks - ${new Date().toLocaleDateString()}\n\n`;

        for (const task of completedTasks) {
            const timeStr = task.startTime ? task.startTime.format('HH:mm') : '--:--';
            const durationStr = task.duration ? `${task.duration}m` : '0m';
            output += `- [x] ${timeStr} [[${task.id}|${task.title}]] (${durationStr})\n`;
        }

        return output;
    }
}
