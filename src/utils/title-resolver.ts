export function resolveTaskTitle(metadata: any, firstLine: string | null, filename: string): string {
    // 1. Metadata 'task' field
    if (metadata && metadata.task) {
        return String(metadata.task);
    }

    // 2. First line of content (if not empty/metadata)
    if (firstLine && firstLine.trim().length > 0 && !firstLine.trim().startsWith('---')) {
        return firstLine.trim().replace(/^#+\s+/, ''); // Strip markdown headers
    }

    // 3. Filename stripping
    // Match YYYYMMDDHHMM_abc_Remainder
    const strippedFn = filename.replace(/\.md$/, '');
    const zettelMatch = strippedFn.match(/^\d{12}_[a-z0-9]{3}_(.*)$/);
    if (zettelMatch && zettelMatch[1]) {
        return zettelMatch[1];
    }

    return strippedFn;
}

export function getFirstNonMetadataLine(content: string): string | null {
    const lines = content.split('\n');
    let inFrontmatter = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '---') {
            if (!inFrontmatter) {
                inFrontmatter = true;
                continue;
            } else {
                inFrontmatter = false;
                continue;
            }
        }
        if (!inFrontmatter && trimmed.length > 0) {
            return trimmed;
        }
    }
    return null;
}
