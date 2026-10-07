const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const assert = require('assert');

const TEMP_REPO = path.resolve(__dirname, '../../test-temp-repo');

console.log('Testing build-contributors.js in an isolated git repository...\n');

try {
  if (fs.existsSync(TEMP_REPO)) {
    fs.rmSync(TEMP_REPO, { recursive: true, force: true });
  }
  fs.mkdirSync(TEMP_REPO, { recursive: true });

  // Init git repo
  execSync('git init', { cwd: TEMP_REPO, stdio: 'ignore' });
  execSync('git config user.name "Test Bot"', { cwd: TEMP_REPO, stdio: 'ignore' });
  execSync('git config user.email "test@example.com"', { cwd: TEMP_REPO, stdio: 'ignore' });

  // Setup directory structure
  fs.mkdirSync(path.join(TEMP_REPO, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(TEMP_REPO, 'contributors'), { recursive: true });

  fs.copyFileSync(path.resolve(__dirname, '../scripts/validate.js'), path.join(TEMP_REPO, 'scripts/validate.js'));
  fs.copyFileSync(path.resolve(__dirname, '../scripts/build-contributors.js'), path.join(TEMP_REPO, 'scripts/build-contributors.js'));

  fs.writeFileSync(path.join(TEMP_REPO, 'contributors/.gitkeep'), '');
  fs.writeFileSync(path.join(TEMP_REPO, 'contributors/example-dummy.txt'), 'Example Name');
  execSync('git add . && git commit -m "init"', { cwd: TEMP_REPO, stdio: 'ignore' });

  // 5 fake contributors committed at different times
  const contributors = [
    { username: 'charlie-dev', name: 'Charlie Dev', date: '2026-01-01T10:00:00Z' },
    { username: 'alice-coder', name: 'Alice Coder', date: '2026-01-02T10:00:00Z' },
    { username: 'david-builder', name: 'David Builder', date: '2026-01-03T10:00:00Z' },
    { username: 'bob-hacker', name: 'Bob Hacker', date: '2026-01-04T10:00:00Z' },
    { username: 'eva-engineer', name: 'Eva Engineer', date: '2026-01-05T10:00:00Z' }
  ];

  for (const c of contributors) {
    const filePath = path.join(TEMP_REPO, `contributors/${c.username}.txt`);
    fs.writeFileSync(filePath, `${c.name}\n`);
    execSync(`git add "contributors/${c.username}.txt"`, { cwd: TEMP_REPO, stdio: 'ignore' });
    execSync(`git commit --date="${c.date}" -m "add ${c.username}"`, {
      cwd: TEMP_REPO,
      env: { ...process.env, GIT_COMMITTER_DATE: c.date },
      stdio: 'ignore'
    });
  }

  // Add an invalid file (should be rejected/skipped by build script)
  fs.writeFileSync(path.join(TEMP_REPO, 'contributors/bad_user$.txt'), 'Bad User');
  fs.writeFileSync(path.join(TEMP_REPO, 'contributors/invalid-html.txt'), '<b>Invalid</b>');

  // Run build-contributors.js in the temp repo
  const output = execSync('node scripts/build-contributors.js', {
    cwd: TEMP_REPO,
    encoding: 'utf8'
  });
  console.log('Build output:\n', output);

  // Verify contributors.json
  const jsonPath = path.join(TEMP_REPO, 'contributors.json');
  assert.ok(fs.existsSync(jsonPath), 'contributors.json was not created');

  const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.ok(Array.isArray(jsonContent), 'contributors.json is not an array');
  assert.strictEqual(jsonContent.length, 5, `Expected 5 contributors, got ${jsonContent.length}`);

  // Verify shape
  for (const item of jsonContent) {
    assert.ok(item.id && typeof item.id === 'string', 'Item missing valid id');
    assert.ok(item.name && typeof item.name === 'string', 'Item missing valid name');
    assert.strictEqual(Object.keys(item).length, 2, 'Item has extra unexpected keys');
  }

  // Verify chronological ordering (oldest first: charlie, alice, david, bob, eva)
  const expectedOrder = ['charlie-dev', 'alice-coder', 'david-builder', 'bob-hacker', 'eva-engineer'];
  const actualOrder = jsonContent.map(x => x.id);
  assert.deepStrictEqual(actualOrder, expectedOrder, `Ordering mismatch! Got: ${actualOrder.join(', ')}`);
  console.log('  ✓ Chronological ordering verified successfully!');

  // Verify idempotency
  const statBefore = fs.statSync(jsonPath).mtimeMs;
  const rerunOutput = execSync('node scripts/build-contributors.js', {
    cwd: TEMP_REPO,
    encoding: 'utf8'
  });
  assert.ok(rerunOutput.includes('already up to date'), 'Second run was not recognized as up-to-date');
  const statAfter = fs.statSync(jsonPath).mtimeMs;
  assert.strictEqual(statBefore, statAfter, 'File was rewritten on redundant run');
  console.log('  ✓ Idempotency verified: identical content was not re-written.');

  console.log('\nAll build script tests passed successfully!');
} finally {
  if (fs.existsSync(TEMP_REPO)) {
    fs.rmSync(TEMP_REPO, { recursive: true, force: true });
  }
}
