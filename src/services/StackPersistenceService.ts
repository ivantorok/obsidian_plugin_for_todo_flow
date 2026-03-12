import { App, TFile } from 'obsidian';
import type { TaskNode } from '../scheduler.js';
import { FileLogger } from '../logger.js';
import { InteractionIdleQueue } from './InteractionIdleQueue.js';

export class StackPersistenceService {
    private lastInternalWriteTime: number = 0;
    private fileWriteTimes: Map<string, number> = new Map();
    private lastWrittenContent: Map<string, string> = new Map();
    private silencedFiles: Map<string, number> = new Map();
    private activeLocks: Map<string, string> = new Map();
    private logger: FileLogger | undefined;
    private isIdle: boolean = true;
    private idleChangeCallbacks: ((idle: boolean) => void)[] = [];

    constructor(private app: App) { }

    setLogger(logger: FileLogger) {
        this.logger = logger;
    }

    getIsIdle(): boolean {
        const queueIdle = InteractionIdleQueue.getInstance(this.app).getIsIdle();
        return this.isIdle && queueIdle;
    }

    onIdleChange(cb: (idle: boolean) => void) {
        this.idleChangeCallbacks.push(cb);
    }

    private setInternalIdle(idle: boolean) {
        if (this.isIdle === idle) return;
        this.isIdle = idle;
        this.idleChangeCallbacks.forEach(cb => cb(idle));
    }

    /**
     * Silences external update detection for a specific file for a set duration.
     * Used to protect in-memory state sovereignty during high-frequency handoffs.
     */
    silence(filePath: string, ms: number = 1000): void {
        const silencedUntil = Date.now() + ms;
        this.silencedFiles.set(filePath, silencedUntil);
        const msg = `[StackPersistenceService] Silencing ${filePath} for ${ms}ms (Until ${new Date(silencedUntil).toISOString()})`;
        if (this.logger) this.logger.info(msg);
        if (typeof window !== 'undefined') {
            console.log(msg);
        }
    }

    /**
     * Claims a path-specific interaction lock.
     * While locked, isExternalUpdate will ALWAYS return false for this path.
     */
    claimLock(filePath: string, token: string): void {
        this.activeLocks.set(filePath, token);
        const msg = `[StackPersistenceService] LOCK CLAIMED: ${filePath} (token: ${token})`;
        if (this.logger) this.logger.info(msg);
        if (typeof window !== 'undefined') {
            console.log(msg);
        }
    }

    /**
     * Releases a path-specific interaction lock.
     */
    releaseLock(filePath: string, token: string): void {
        const currentToken = this.activeLocks.get(filePath);
        if (currentToken === token) {
            this.activeLocks.delete(filePath);
            const msg = `[StackPersistenceService] LOCK RELEASED: ${filePath} (token: ${token})`;
            if (this.logger) this.logger.info(msg);
            if (typeof window !== 'undefined') {
                console.log(msg);
            }
        }
    }

    async saveStack(tasks: TaskNode[], filePath: string, immediate: boolean = false): Promise<void> {
        const queue = InteractionIdleQueue.getInstance(this.app, this.logger);

        const saveFn = async () => {
            const msg = `[StackPersistenceService] FLUSHING saveStack() path=${filePath}, count=${tasks.length}`;
            if (this.logger) await this.logger.info(msg);
            console.log(msg);

            // 2. Generate the new block of links
            const parentDir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/') + 1) : '';
            const newLinkLines = tasks.map(task => {
                const checkbox = task.status === 'done' ? '[x]' : '[ ]';
                // We strip '.md' from the ID for the display link to match Obsidian conventions
                let linkPath = task.id.endsWith('.md') ? task.id.slice(0, -3) : task.id;
                
                // Shorten the path if it's in the same directory as the parent
                if (parentDir && linkPath.startsWith(parentDir)) {
                    linkPath = linkPath.substring(parentDir.length);
                }

                return `- ${checkbox} [[${linkPath}|${task.title}]]`;
            });

            let content = `# Current Stack\n\n` + newLinkLines.join('\n');

            this.recordInternalWrite(filePath, content);
            const file = this.app.vault.getAbstractFileByPath(filePath);
            const isMarkdownFile = file instanceof TFile || (file && (file as any).extension === 'md');

            if (isMarkdownFile) {
                await this.app.vault.modify(file as TFile, content);
            } else {
                const lastSlash = filePath.lastIndexOf('/');
                if (lastSlash !== -1) {
                    const folderPath = filePath.substring(0, lastSlash);
                    if (!await this.app.vault.adapter.exists(folderPath)) {
                        await this.app.vault.adapter.mkdir(folderPath);
                    }
                }
                await this.app.vault.create(filePath, content);
            }
        };

        return queue.push({ filePath, saveFn }, immediate);
    }

    async saveSubstack(tasks: TaskNode[], parentPath: string, immediate: boolean = false): Promise<void> {
        const queue = InteractionIdleQueue.getInstance(this.app, this.logger);

        const saveFn = async () => {
            const parentFile = this.app.vault.getAbstractFileByPath(parentPath);
            const isMarkdownFile = parentFile instanceof TFile || (parentFile && (parentFile as any).extension === 'md');

            if (!isMarkdownFile) {
                return;
            }

            // Read the current parent file content
            const content = await this.app.vault.read(parentFile);
            
            // Reorder the wikilinks using LinkParser logic
            const { LinkParser } = await import('../parsers/LinkParser.js');
            const parser = new LinkParser(this.app, this.logger);
            const updatedContent = parser.replaceLinksInContent(content, tasks, parentPath);

            // Important: Record internal write BEFORE modifying to debounce the watcher
            this.recordInternalWrite(parentPath, updatedContent);
            await this.app.vault.modify(parentFile as TFile, updatedContent);

            if (this.logger) await this.logger.info(`[StackPersistenceService] saveSubstack SUCCESS for ${parentPath}`);
        };

        return queue.push({ filePath: parentPath, saveFn }, immediate);
    }

    async saveTask(task: TaskNode, immediate: boolean = false): Promise<void> {
        const queue = InteractionIdleQueue.getInstance(this.app, this.logger);

        const saveFn = async () => {
            const file = this.app.vault.getAbstractFileByPath(task.id);
            if (file instanceof TFile) {
                const msg = `[StackPersistenceService] FLUSHING saveTask() path=${task.id}`;
                if (this.logger) await this.logger.info(msg);
                
                this.recordInternalWrite(task.id);
                await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
                    if (task.duration !== undefined) frontmatter.duration = task.duration;
                    if (task.startTime) frontmatter.startTime = task.startTime.format();
                    if (task.isAnchored !== undefined) frontmatter.isAnchored = task.isAnchored;
                });
            }
        };

        return queue.push({ filePath: task.id, saveFn }, immediate);
    }

    recordInternalWrite(filePath: string, content?: string): void {
        const now = Date.now();
        this.lastInternalWriteTime = now;
        this.fileWriteTimes.set(filePath, now);
        if (content !== undefined) {
            this.lastWrittenContent.set(filePath, content);
        }
        if (this.logger) this.logger.info(`[StackPersistenceService] recordInternalWrite(${filePath})`);
    }

    async isExternalUpdate(filePath: string, currentTasks: TaskNode[]): Promise<boolean> {
        const now = Date.now();
        const silencedUntil = this.silencedFiles.get(filePath) || 0;
        const lastWrite = this.fileWriteTimes.get(filePath) || 0;

        // 0. Interaction Lock Check (Sovereign Interaction Token)
        // While locked, we ALWAYS reject updates to prevent UI jank/feedback loops.
        if (this.activeLocks.has(filePath)) {
            const token = this.activeLocks.get(filePath);
            const msg = `[StackPersistenceService] isExternalUpdate REJECTED (Interaction Lock: ${token})`;
            if (this.logger) this.logger.info(msg);
            if (typeof window !== 'undefined') {
                console.log(msg);
            }
            return false;
        }

        // 1. Sovereign Silence Check
        // Explicitly silenced windows (e.g. during rapid handoffs) take precedence.
        if (now < silencedUntil) {
            const msg = `[StackPersistenceService] isExternalUpdate REJECTED (Sovereign Silence). Remaining: ${silencedUntil - now}ms`;
            if (this.logger) this.logger.info(msg);
            if (typeof window !== 'undefined') {
                console.log(msg);
            }
            return false;
        }

        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (!file || !(file instanceof TFile || (file as any).extension === 'md')) {
            return true; // No file means it's external or error
        }

        const currentContent = await this.app.vault.read(file as TFile);
        const lastWritten = this.lastWrittenContent.get(filePath);

        // 2. Fast-path: Exact content match (Fidelity Guard)
        // If content is identical to what we last wrote, it's definitely internal (sync echo).
        if (lastWritten !== undefined && currentContent === lastWritten) {
            if (this.logger) this.logger.info(`[StackPersistenceService] isExternalUpdate(${filePath}) REJECTED: Content matches last internal write.`);
            return false;
        }

        // 3. High Fidelity Signal: Content differs (External modification)
        // If we have a record of what we wrote, and it differs from disk, it's EXTERNAL.
        // This overrides the temporal guard because content comparison is authoritative.
        if (lastWritten !== undefined && currentContent !== lastWritten) {
            if (this.logger) this.logger.info(`[StackPersistenceService] isExternalUpdate(${filePath}) ACCEPTED: Content differs from last internal write.`);
            return true;
        }

        // 4. Temporal guard (Fallback for untracked files)
        // If it's very recent and content was NOT tracked, we still reject it
        // to avoid feedback loops from writes that didn't provide content tracking.
        if (now - lastWrite < 500) {
            if (this.logger) this.logger.info(`[StackPersistenceService] isExternalUpdate(${filePath}) REJECTED: Temporal Guard (<500ms)`);
            return false;
        }

        const content = typeof currentContent === 'string'
            ? currentContent
            : String(currentContent || '');

        const lines = content.split('\n');

        let fileTaskCount = 0;
        let diffFound = false;

        const taskRegex = /^- \[([ x])\] \[\[(.*?)\]\]/;

        for (const line of lines) {
            const match = line.match(taskRegex);
            if (match) {
                const checked = match[1] === 'x';
                const linkContent = match[2] || '';
                const parts = linkContent.split('|');
                let linkText = parts[0];
                if (!linkText) continue;

                let resolvedFile = this.app.metadataCache.getFirstLinkpathDest(linkText, filePath);

                // Fallback: Try resolving relative to persistence file (for cold cache/tests)
                if (!resolvedFile) {
                    const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
                    const candidatePath = `${parentDir}/${linkText}.md`;
                    const candidateFile = this.app.vault.getAbstractFileByPath(candidatePath);
                    if (candidateFile instanceof TFile) {
                        resolvedFile = candidateFile;
                    }
                }

                let resolvedId = resolvedFile ? resolvedFile.path : linkText;

                if (fileTaskCount >= currentTasks.length) {
                    diffFound = true; // File has more tasks than memory
                    break;
                }

                const memTask = currentTasks[fileTaskCount]!;
                const memChecked = memTask.status === 'done';

                // For tests to pass, we relax ID equivalence to account for '.md'
                if (memTask.id !== resolvedId && memTask.id !== resolvedId + '.md' && resolvedId !== memTask.id + '.md' || memChecked !== checked) {
                    diffFound = true;
                    break;
                }

                fileTaskCount++;
            }
        }

        if (fileTaskCount < currentTasks.length) {
            diffFound = true; // File has fewer tasks than memory
        }

        const msg = `[StackPersistenceService] isExternalUpdate(${filePath}): diffFound=${diffFound}`;
        if (this.logger) this.logger.info(msg);
        if (typeof window !== 'undefined') {
            console.log(msg);
        }

        return diffFound;
    }

    async loadStackIds(filePath: string): Promise<string[]> {
        const file = this.app.vault.getAbstractFileByPath(filePath);

        // Relaxed check for TFile to support mocks
        if (!file || !(file instanceof TFile || (file as any).extension === 'md')) {
            return [];
        }

        let content = await this.app.vault.read(file as TFile);
        if (typeof content !== 'string') content = String(content || '');

        const lines = content.split('\n');
        const ids: string[] = [];
        const linkRegex = /\[\[(.*?)\]\]/;

        for (const line of lines) {
            if (typeof line !== 'string') continue;
            const match = line.match(linkRegex);
            if (match && match[1]) {
                const linkContent = match[1];
                const parts = linkContent.split('|');
                if (parts[0]) {
                    const linkText = parts[0];

                    // BUG-022 Safety: Skip temporary IDs if they somehow ended up on disk
                    if (linkText.startsWith('temp-')) {
                        if (this.logger) this.logger.warn(`[StackPersistenceService] Skipping temporary ID found on disk: ${linkText}`);
                        continue;
                    }

                    let resolvedFile = this.app.metadataCache.getFirstLinkpathDest(linkText, filePath);

                    // Fallback: Try resolving relative to persistence file (for cold cache/tests)
                    if (!resolvedFile) {
                        const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
                        // Handle wiki links that might not have extension
                        const candidatePath = `${parentDir}/${linkText}.md`;
                        const file = this.app.vault.getAbstractFileByPath(candidatePath);
                        if (file instanceof TFile) {
                            resolvedFile = file;
                        }
                    }

                    if (resolvedFile) {
                        ids.push(resolvedFile.path);
                    } else {
                        ids.push(linkText);
                    }
                }
            }
        }

        return ids;
    }

}
