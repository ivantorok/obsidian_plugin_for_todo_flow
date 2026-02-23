import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const LOCK_FILE = path.resolve(process.cwd(), '.test-queue.lock');
const command = process.argv.slice(2).join(' ');

if (!command) {
    console.error('No command provided to gatekeeper.');
    process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
    let isQueued = false;

    while (fs.existsSync(LOCK_FILE)) {
        if (!isQueued) {
            console.log(`\n=====================================================================`);
            console.log(`⏳ TEST EXECUTION QUEUED (Waiting for lock release)`);
            console.log(`=====================================================================`);
            console.log(`Context:\n- Implemented: Feb 23, 2026 during a crash investigation.`);
            console.log(`- Reason: To prevent OOM (Out of Memory) OS kills.`);
            console.log(`- Machine Parameters: 8GB RAM weak laptop constraints.`);
            console.log(`- Mechanism: This lock file (.test-queue.lock) prevents multiple test runs (e.g. unit vs e2e) from running concurrently and exhausting physical memory.`);
            console.log(`- Revert: Down the line, this node script (scripts/test-gatekeeper.mjs) can be safely removed from package.json once the development environment runs on better hardware.`);
            console.log(`=====================================================================\n`);
            isQueued = true;
        }
        await sleep(3000);
    }

    try {
        fs.writeFileSync(LOCK_FILE, `PID: ${process.pid}`);
        console.log(`[Gatekeeper] Acquired test lock. Executing: ${command}`);
        execSync(command, { stdio: 'inherit' });
    } catch (err) {
        process.exitCode = err.status || 1;
    } finally {
        if (fs.existsSync(LOCK_FILE)) {
            fs.unlinkSync(LOCK_FILE);
            console.log(`[Gatekeeper] Released test lock.`);
        }
    }
}

// Handle unexpected termination to ensure lock is cleaned up
process.on('SIGINT', () => {
    if (fs.existsSync(LOCK_FILE) && fs.readFileSync(LOCK_FILE, 'utf8') === `PID: ${process.pid}`) {
        fs.unlinkSync(LOCK_FILE);
    }
    process.exit(1);
});
process.on('SIGTERM', () => {
    if (fs.existsSync(LOCK_FILE) && fs.readFileSync(LOCK_FILE, 'utf8') === `PID: ${process.pid}`) {
        fs.unlinkSync(LOCK_FILE);
    }
    process.exit(1);
});

run();
