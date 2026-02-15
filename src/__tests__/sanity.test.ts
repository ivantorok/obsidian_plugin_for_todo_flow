
import { describe, test, expect } from 'vitest';
import { GraphBuilder } from './GraphBuilder.repro.js';

describe('Sanity Check', () => {
    test('should import GraphBuilder without hanging', () => {
        expect(GraphBuilder).toBeDefined();
    });
});
