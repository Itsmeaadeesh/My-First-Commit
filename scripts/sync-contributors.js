/**
 * scripts/sync-contributors.js
 * Pulls latest merged PRs from GitHub, updates contributors.json,
 * and pushes back to GitHub.
 * 
 * Run with: npm run sync
 */

const path = require('path');
const { execSync } = require('child_process');
const { buildContributors } = require('./build-contributors');

const ROOT_DIR = path.resolve(__dirname, '..');

function sync() {
  console.log('🔄 Fetching latest merged contributions from GitHub...');
  try {
    execSync('git pull origin main', { cwd: ROOT_DIR, stdio: 'inherit' });
  } catch (err) {
    console.error('Git pull failed:', err.message);
    process.exit(1);
  }

  console.log('📦 Rebuilding contributors.json...');
  buildContributors();

  try {
    execSync('git add contributors.json', { cwd: ROOT_DIR, stdio: 'inherit' });
    const diff = execSync('git diff --staged', { cwd: ROOT_DIR, encoding: 'utf8' }).trim();

    if (!diff) {
      console.log('✅ contributors.json is already up to date. Nothing to push.');
      return;
    }

    execSync('git commit -m "chore: update contributors.json"', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('🚀 Pushing updated contributors.json to GitHub...');
    execSync('git push origin main', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('🎉 Done! Live puzzle wall will reflect new pieces immediately.');
  } catch (err) {
    console.error('Commit or push failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  sync();
}

module.exports = { sync };
