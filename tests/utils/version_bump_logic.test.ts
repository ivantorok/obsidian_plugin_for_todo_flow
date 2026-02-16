import { describe, it, expect } from 'vitest';

// Extracted logic from version_bump.mjs (conceptually)
export function getNextVersion(currentVersion: string): string {
    if (!/^\d+\.\d+\.\d+$/.test(currentVersion)) {
        throw new Error(`Invalid version format: ${currentVersion}. Expected x.y.z`);
    }
    const parts = currentVersion.split('.').map(Number);
    if (parts.some(isNaN)) {
        throw new Error(`Invalid version number parts in: ${currentVersion}`);
    }
    if (parts.length < 3) {
        throw new Error(`Invalid version format: ${currentVersion}. Expected x.y.z`);
    }
    if (parts[2] === undefined) throw new Error('Unreachable');
    parts[2] += 1;
    const newVersion = parts.join('.');
    if (newVersion.includes('NaN')) {
        throw new Error(`Generated invalid version identifier: ${newVersion}`);
    }
    return newVersion;
}

describe('version_bump logic', () => {
    it('increments patch version correctly', () => {
        expect(getNextVersion('1.2.63')).toBe('1.2.64');
        expect(getNextVersion('0.0.1')).toBe('0.0.2');
        expect(getNextVersion('1.0.0')).toBe('1.0.1');
    });

    it('throws on invalid version format', () => {
        expect(() => getNextVersion('1.2')).toThrow('Invalid version format');
        expect(() => getNextVersion('1.2.a')).toThrow('Invalid version format');
        expect(() => getNextVersion('v1.2.3')).toThrow('Invalid version format'); // Assuming no 'v' prefix in package.json
    });

    it('throws on potential NaN generation', () => {
        expect(() => getNextVersion('1.2.NaN')).toThrow(/Invalid version/);
    });
});
