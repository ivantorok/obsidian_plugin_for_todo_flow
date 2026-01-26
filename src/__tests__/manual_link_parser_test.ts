import { App } from 'obsidian';
import { LinkParser } from '../parsers/LinkParser.js';

/**
 * Manual Test Script for LinkParser
 * 
 * This script demonstrates the LinkParser with real file examples.
 * You can run this in Obsidian's developer console or as a command.
 */

export async function testLinkParser(app: App) {
    const parser = new LinkParser(app);

    console.log('=== LinkParser Manual Test ===\n');

    // Test 1: Simple wikilinks
    console.log('Test 1: Simple wikilinks');
    try {
        const tasks1 = await parser.parse('test-files/parent.md');
        console.log(`Found ${tasks1.length} tasks:`);
        tasks1.forEach(task => {
            console.log(`  - ${task.title} (${task.id})`);
        });
    } catch (e) {
        console.error('Error:', e);
    }

    console.log('\n---\n');

    // Test 2: Custom display text
    console.log('Test 2: Custom display text');
    try {
        const tasks2 = await parser.parse('test-files/custom-links.md');
        console.log(`Found ${tasks2.length} tasks:`);
        tasks2.forEach(task => {
            console.log(`  - ${task.title} (${task.id})`);
        });
    } catch (e) {
        console.error('Error:', e);
    }

    console.log('\n=== Test Complete ===');
}
