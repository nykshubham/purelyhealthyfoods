
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

async function runGenerator() {
    try {
        console.log(`[Scheduler] Triggering content generation at ${new Date().toISOString()}...`);
        const { stdout, stderr } = await execPromise('npx tsx scripts/generate-content.ts');

        console.log(stdout);
        if (stderr) console.error('[Generator Error]:', stderr);

    } catch (error) {
        console.error('[Scheduler Error]: Failed to run generator:', error);
    }
}

console.log(`[Scheduler] Content Automation Started.`);
console.log(`[Scheduler] Frequency: Every 60 minutes.`);
console.log(`[Scheduler] Distribution: ~60% News, ~40% Recipes/Blog/Weight Mgmt.`);
console.log(`[Scheduler] Press Ctrl+C to stop.`);

// Run immediately on start
runGenerator();

// Then verify every hour
setInterval(runGenerator, INTERVAL_MS);
