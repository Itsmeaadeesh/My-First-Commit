/**
 * scripts/watch.js
 * Live watcher during the event.
 * Periodically checks for new manual PR merges on GitHub,
 * rebuilds contributors.json, and pushes to GitHub.
 * 
 * Run with: npm run watch
 */

const path = require('path');
const { execSync } = require('child_process');
const { buildContributors } = require('./build-contributors');

const ROOT_DIR = path.resolve(__dirname, '..');
const POLL_INTERVAL_MS = 10000;

function checkAndSync() {
  try {
    // Fetch origin
    execSync('git fetch origin main', { cwd: ROOT_DIR, stdio: 'ignore' });
    const localHead = execSync('git rev-parse HEAD', { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
    const remoteHead = execSync('git rev-parse origin/main', { cwd: ROOT_DIR, encoding: 'utf8' }).trim();

    if (localHead !== remoteHead) {
      console.log(`[${new Date().toLocaleTimeString()}] 🔔 New commit detected on GitHub! Syncing...`);
      execSync('git pull origin main', { cwd: ROOT_DIR, stdio: 'ignore' });
      buildContributors();
      execSync('git add contributors.json', { cwd: ROOT_DIR, stdio: 'ignore' });

      const diff = execSync('git diff --staged', { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
      if (diff) {
        execSync('git commit -m "chore: update contributors.json"', { cwd: ROOT_DIR, stdio: 'ignore' });
        execSync('git push origin main', { cwd: ROOT_DIR, stdio: 'ignore' });
        console.log(`[${new Date().toLocaleTimeString()}] 🚀 Updated contributors.json pushed to GitHub! Wall updated.`);
      }
    }
  } catch (err) {
    // Ignore transient network errors
  }
}

console.log('===========================================================');
console.log('👀 Live Event Watcher is active!');
console.log('Merge PRs manually on github.com as you like.');
console.log('This script will automatically detect merged PRs, update');
console.log('contributors.json, and push it to update the live wall!');
console.log('Press Ctrl+C to stop.');
console.log('===========================================================\n');

checkAndSync();
setInterval(checkAndSync, POLL_INTERVAL_MS);
