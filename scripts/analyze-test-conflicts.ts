#!/usr/bin/env node
/**
 * Test Conflict Analyzer
 * 
 * Analyzes E2E tests for potential conflicts:
 * - Shared file/resource usage without proper cleanup
 * - Tests that modify global state
 * - Missing beforeEach/afterEach hooks
 * - Hardcoded file names that could collide
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestAnalysis {
    file: string;
    sharedResources: string[];
    hasBeforeEach: boolean;
    hasAfterEach: boolean;
    createsFiles: string[];
    modifiesFiles: string[];
    usesCurrentStack: boolean;
    hardcodedNames: string[];
}

function analyzeTestFile(filePath: string): TestAnalysis {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);

    const analysis: TestAnalysis = {
        file: fileName,
        sharedResources: [],
        hasBeforeEach: content.includes('beforeEach'),
        hasAfterEach: content.includes('afterEach'),
        createsFiles: [],
        modifiesFiles: [],
        usesCurrentStack: content.includes('CurrentStack.md'),
        hardcodedNames: []
    };

    // Detect file creation patterns
    const createPatterns = [
        /app\.vault\.create\(['"]([^'"]+)['"]/g,
        /adapter\.write\(['"]([^'"]+)['"]/g,
    ];

    createPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            analysis.createsFiles.push(match[1]);
        }
    });

    // Detect file modification patterns
    const modifyPatterns = [
        /adapter\.write\(['"]([^'"]+)['"]/g,
        /app\.vault\.modify\(['"]([^'"]+)['"]/g,
    ];

    modifyPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            analysis.modifiesFiles.push(match[1]);
        }
    });

    // Detect hardcoded task/file names
    const namePatterns = [
        /"(Card \d+)"/g,
        /"(Task\d+)"/g,
        /"(Alpha|Beta|Gamma|Delta)"/g,
    ];

    namePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            if (!analysis.hardcodedNames.includes(match[1])) {
                analysis.hardcodedNames.push(match[1]);
            }
        }
    });

    return analysis;
}

function detectConflicts(analyses: TestAnalysis[]): void {
    console.log('\n=== TEST CONFLICT ANALYSIS ===\n');

    // 1. Check for shared hardcoded names
    const nameUsage = new Map<string, string[]>();
    analyses.forEach(analysis => {
        analysis.hardcodedNames.forEach(name => {
            if (!nameUsage.has(name)) {
                nameUsage.set(name, []);
            }
            nameUsage.get(name)!.push(analysis.file);
        });
    });

    console.log('1. SHARED HARDCODED NAMES:');
    let hasSharedNames = false;
    nameUsage.forEach((files, name) => {
        if (files.length > 1) {
            console.log(`   ⚠️  "${name}" used in: ${files.join(', ')}`);
            hasSharedNames = true;
        }
    });
    if (!hasSharedNames) {
        console.log('   ✅ No shared hardcoded names detected');
    }

    // 2. Check for CurrentStack.md usage
    console.log('\n2. CURRENTSTACK.MD USAGE:');
    const stackUsers = analyses.filter(a => a.usesCurrentStack);
    if (stackUsers.length > 1) {
        console.log(`   ⚠️  ${stackUsers.length} tests modify CurrentStack.md:`);
        stackUsers.forEach(a => {
            const cleanup = a.hasBeforeEach && a.hasAfterEach ? '✅' : '❌';
            console.log(`      ${cleanup} ${a.file} (beforeEach: ${a.hasBeforeEach}, afterEach: ${a.hasAfterEach})`);
        });
    } else {
        console.log('   ✅ Only one test uses CurrentStack.md');
    }

    // 3. Check for missing cleanup hooks
    console.log('\n3. CLEANUP HOOKS:');
    const missingCleanup = analyses.filter(a => !a.hasBeforeEach || !a.hasAfterEach);
    if (missingCleanup.length > 0) {
        console.log(`   ⚠️  ${missingCleanup.length} tests missing cleanup hooks:`);
        missingCleanup.forEach(a => {
            console.log(`      - ${a.file} (beforeEach: ${a.hasBeforeEach}, afterEach: ${a.hasAfterEach})`);
        });
    } else {
        console.log('   ✅ All tests have cleanup hooks');
    }

    // 4. Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Total tests analyzed: ${analyses.length}`);
    console.log(`Tests using CurrentStack.md: ${stackUsers.length}`);
    console.log(`Tests with shared names: ${hasSharedNames ? 'YES ⚠️' : 'NO ✅'}`);
    console.log(`Tests missing cleanup: ${missingCleanup.length}`);

    // 5. Recommendations
    if (hasSharedNames || stackUsers.length > 1 || missingCleanup.length > 0) {
        console.log('\n=== RECOMMENDATIONS ===');
        if (hasSharedNames) {
            console.log('• Use unique identifiers (timestamps, UUIDs) instead of hardcoded names');
        }
        if (stackUsers.length > 1) {
            console.log('• Ensure each test fully cleans up CurrentStack.md in afterEach');
            console.log('• Consider running tests that modify CurrentStack.md sequentially');
        }
        if (missingCleanup.length > 0) {
            console.log('• Add beforeEach/afterEach hooks to ensure test isolation');
        }
    }
}

// Main execution
const testDir = path.join(process.cwd(), 'tests', 'e2e');
const testFiles = fs.readdirSync(testDir)
    .filter(f => f.endsWith('.spec.ts') && f !== 'manual-open.spec.ts')
    .map(f => path.join(testDir, f));

const analyses = testFiles.map(analyzeTestFile);
detectConflicts(analyses);
