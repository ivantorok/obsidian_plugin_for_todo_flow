import { type App, TFile, Notice } from 'obsidian';
import { updateMetadataField } from '../persistence.js';

export class SyncService {
    constructor(private app: App) { }

    async syncExportToVault(exportContent: string): Promise<number> {
        const lines = exportContent.split('\n');
        // Regex for: - [x] 09:15 [[ID|Title]] ... OR - [x] 09:15 [[ID]] ...
        // Matches anything inside [[...]] and optionally strips |Title
        const doneRegex = /-\s*\[x\]\s*.*\s*\[\[(.+?)(?:\|.+)?\]\]/;

        let updateCount = 0;

        for (const line of lines) {
            const match = line.match(doneRegex);
            if (match) {
                const idOrPath = match[1];
                if (idOrPath) {
                    await this.updateFileStatus(idOrPath, 'done');
                    updateCount++;
                }
            }
        }
        return updateCount;
    }

    private async updateFileStatus(path: string, status: string) {
        const file = this.app.vault.getAbstractFileByPath(path);

        if (file instanceof TFile && file.extension === 'md') {
            await this.app.vault.process(file, (content) => {
                return updateMetadataField(content, 'status', status);
            });
        } else {
            // If file not found by direct path, try resolving it via MetadataCache if it's a wikilink ID?
            // For now, we assume the ID is the path (as per current persistence implementation).
            // If ID != path, we should use app.metadataCache.getFirstLinkpathDest(path, '')
            if (!file) {
                const resolvedFile = this.app.metadataCache.getFirstLinkpathDest(path, '');
                if (resolvedFile instanceof TFile) {
                    await this.app.vault.process(resolvedFile, (content) => {
                        return updateMetadataField(content, 'status', status);
                    });
                }
            }
        }
    }
}
