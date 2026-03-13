import fs from 'fs';
import path from 'path';

const type = process.argv[2]; // 'unit' or 'e2e'
if (!['unit', 'e2e'].includes(type)) {
    console.error('Usage: node log_test_run.mjs <unit|e2e>');
    process.exit(1);
}

const logDir = 'logs';
const historyFile = path.join(logDir, 'test-history.jsonl');
const resultsFileName = type === 'unit' ? 'vitest-results.json' : 'wdio-results.json';
const resultsFile = process.env.TF_ARTIFACT_DIR
    ? path.join(process.env.TF_ARTIFACT_DIR, resultsFileName)
    : path.join(logDir, resultsFileName);

if (!fs.existsSync(resultsFile)) {
    console.error(`Results file not found: ${resultsFile}`);
    process.exit(1);
}

try {
    const data = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    let metrics;

    if (type === 'unit') {
        metrics = {
            type: 'unit',
            total: data.numTotalTests,
            passed: data.numPassedTests,
            failed: data.numFailedTests,
            duration: data.startTime ? (Date.now() - data.startTime) : 0, // Vitest uses milliseconds
        };
    } else {
        metrics = {
            type: 'e2e',
            total: data.passed + data.failed,
            passed: data.passed,
            failed: data.failed,
            duration: data.duration,
        };
    }

    const logEntry = {
        timestamp: new Date().toISOString(),
        ...metrics
    };

    fs.appendFileSync(historyFile, JSON.stringify(logEntry) + '\n');
    console.log(`[LOG] Recorded ${type} results to ${historyFile}`);
} catch (error) {
    console.error(`Failed to log test run: ${error.message}`);
    process.exit(1);
}
