/**
 * scripts/build-contributors.js
 * Scans contributors/*.txt, validates each file, sorts by git add date,
 * and outputs contributors.json in an idempotent manner.
 * Plain Node (zero dependencies).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { validateFile } = require('./validate');

const ROOT_DIR = path.resolve(__dirname, '..');
const CONTRIBUTORS_DIR = path.join(ROOT_DIR, 'contributors');
const OUTPUT_FILE = path.join(ROOT_DIR, 'contributors.json');

function getGitAddDate(filePath) {
  try {
    const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
    const stdout = execSync(`git log --diff-filter=A --follow --format=%cI --reverse -- "${relPath}"`, {
      cwd: ROOT_DIR,
      stdio: ['pipe', 'pipe', 'ignore'],
      encoding: 'utf8'
    }).trim();

    if (stdout) {
      const firstLine = stdout.split(/\r?\n/)[0].trim();
      if (firstLine) return firstLine;
    }
  } catch {
    // Git log failed or file is not yet committed
  }

  // Fallback to file mtime or current time
  try {
    const stat = fs.statSync(filePath);
    return stat.birthtime.toISOString() || stat.mtime.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function buildContributors() {
  if (!fs.existsSync(CONTRIBUTORS_DIR)) {
    console.error(`Error: contributors directory not found at ${CONTRIBUTORS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(CONTRIBUTORS_DIR);
  const contributors = [];
  const errors = [];

  for (const file of files) {
    // Ignore .gitkeep and anything starting with "example" or hidden files
    if (file === '.gitkeep' || file.startsWith('.') || file.toLowerCase().startsWith('example')) {
      continue;
    }

    if (!file.endsWith('.txt')) {
      errors.push(`Ignoring unexpected file (not .txt): ${file}`);
      continue;
    }

    const fullPath = path.join(CONTRIBUTORS_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');

    const result = validateFile(file, content);
    if (!result.valid) {
      errors.push(`Validation failed for ${file}:\n  - ${result.errors.join('\n  - ')}`);
      continue;
    }

    const addDate = getGitAddDate(fullPath);

    contributors.push({
      id: result.username,
      name: result.name,
      _date: addDate
    });
  }

  if (errors.length > 0) {
    console.warn(`Warnings/errors during build:\n${errors.join('\n')}`);
  }

  // Sort: oldest git add date first, tie-break by id (username)
  contributors.sort((a, b) => {
    if (a._date < b._date) return -1;
    if (a._date > b._date) return 1;
    return a.id.localeCompare(b.id);
  });

  // Strip internal _date before writing
  const outputData = contributors.map(({ id, name }) => ({ id, name }));
  const outputJson = JSON.stringify(outputData, null, 2) + '\n';

  // Idempotent check: only write if changed
  let existingJson = null;
  if (fs.existsSync(OUTPUT_FILE)) {
    existingJson = fs.readFileSync(OUTPUT_FILE, 'utf8');
  }

  if (existingJson === outputJson) {
    console.log(`contributors.json is already up to date (${outputData.length} contributors). No changes written.`);
  } else {
    fs.writeFileSync(OUTPUT_FILE, outputJson, 'utf8');
    console.log(`Updated contributors.json successfully (${outputData.length} contributors).`);
  }

  return outputData;
}

if (require.main === module) {
  buildContributors();
}

module.exports = { buildContributors, getGitAddDate };
