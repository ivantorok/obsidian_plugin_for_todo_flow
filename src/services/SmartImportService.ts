import { App, TFile } from 'obsidian';
import { StackPersistenceService } from './StackPersistenceService.js';
import { StackLoader } from '../loaders/StackLoader.js';
import { FileLogger } from '../logger.js';

export class SmartImportService {
    private persistence: StackPersistenceService;

    constructor(private app: App, private logger?: FileLogger) {
        this.persistence = new StackPersistenceService(app);
    }

    /**
     * Returns an array of file paths linked FROM the specified file.
     * Uses Obsidian's resolvedLinks cache.
     */
    getOutboundLinks(sourcePath: string): string[] {
        const resolvedLinks = this.app.metadataCache.resolvedLinks;
        const linksForFile = resolvedLinks[sourcePath];

        if (!linksForFile) {
            return [];
        }

        // The keys are the absolute paths to the linked files
        return Object.keys(linksForFile);
    }

    /**
     * Extracts links from sourcePath and appends them to CurrentStack.md if not already present.
     */
    async importLinksToDailyStack(sourcePath: string, targetFolder: string = 'todo-flow'): Promise<number> {
        const links = this.getOutboundLinks(sourcePath);
        if (links.length === 0) return 0;

        const dailyFile = `${targetFolder}/CurrentStack.md`;
        if (this.logger) this.logger.info(`[SmartImportService] Daily stack path: ${dailyFile}`);
        const existingIds = await this.persistence.loadStackIds(dailyFile);

        const mergedIds = [...existingIds];
        let addedCount = 0;
        for (const link of links) {
            if (!mergedIds.includes(link)) {
                mergedIds.push(link);
                addedCount++;
            }
        }

        if (addedCount > 0) {
            const loader = new StackLoader(this.app, this.logger);
            const nodes = await loader.loadSpecificFiles(mergedIds);
            await this.persistence.saveStack(nodes, dailyFile);
        }

        return addedCount;
    }
}
