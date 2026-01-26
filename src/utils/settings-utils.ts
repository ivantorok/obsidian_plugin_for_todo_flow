export function formatKeys(keys: string[]): string {
    if (!keys || !Array.isArray(keys)) return '';
    return keys.join(', ');
}

export function parseKeys(input: string): string[] {
    if (!input || !input.trim()) return [];
    return input.split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
}
