import { describe, it, expect, vi } from 'vitest';
import { SmartImportService } from '../services/SmartImportService.js';
import { App, TFile } from 'obsidian';

describe('SmartImportService', () => {
    it('should extract unique outbound links from a file path', async () => {
        const mockResolvedLinks: Record<string, Record<string, number>> = {
            'active-file.md': {
                'link1.md': 1,
                'link2.md': 2,
                'folder/link3.md': 1
            }
        };

        const mockApp = {
            metadataCache: {
                resolvedLinks: mockResolvedLinks
            }
        } as unknown as App;

        const service = new SmartImportService(mockApp);
        const links = service.getOutboundLinks('active-file.md');

        expect(links).toEqual(['link1.md', 'link2.md', 'folder/link3.md']);
    });

    it('should return empty array if file has no links', () => {
        const mockApp = {
            metadataCache: {
                resolvedLinks: {}
            }
        } as unknown as App;

        const service = new SmartImportService(mockApp);
        const links = service.getOutboundLinks('empty-file.md');

        expect(links).toBeDefined();
        expect(links.length).toBe(0);
    });
});
