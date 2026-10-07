const assert = require('assert');
const { validateFilename, validateDisplayName, validateFile } = require('../scripts/validate');

console.log('Running unit tests for validate.js...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// 1. Filename validation tests
test('Valid filename with matching username', () => {
  const res = validateFilename('contributors/aarav-sharma.txt', 'aarav-sharma');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.username, 'aarav-sharma');
  assert.strictEqual(res.errors.length, 0);
});

test('Valid filename case-insensitive match', () => {
  const res = validateFilename('contributors/AaravSharma.txt', 'aaravsharma');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.username, 'aaravsharma');
});

test('Reject path traversal ../x', () => {
  const res1 = validateFilename('../evil.txt');
  assert.strictEqual(res1.valid, false);
  const res2 = validateFilename('contributors/../../evil.txt');
  assert.strictEqual(res2.valid, false);
});

test('Reject nested directory', () => {
  const res = validateFilename('contributors/sub/user.txt');
  assert.strictEqual(res.valid, false);
});

test('Reject non-.txt extension', () => {
  const res = validateFilename('contributors/user.json');
  assert.strictEqual(res.valid, false);
});

test('Reject empty username or .txt alone', () => {
  const res = validateFilename('contributors/.txt');
  assert.strictEqual(res.valid, false);
});

test('Reject spaces in username', () => {
  const res = validateFilename('contributors/aarav sharma.txt');
  assert.strictEqual(res.valid, false);
});

test('Reject filenames starting with example', () => {
  const res = validateFilename('contributors/example-user.txt');
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('example')));
});

test('Allow example if explicitly permitted in options', () => {
  const res = validateFilename('contributors/example-user.txt', null, { allowExample: true });
  assert.strictEqual(res.valid, true);
});

test('Reject mismatched username', () => {
  const res = validateFilename('contributors/alice.txt', 'bob');
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('does not match')));
});

// 2. Display name validation tests
test('Valid ASCII display name', () => {
  const res = validateDisplayName('Aarav Sharma');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.name, 'Aarav Sharma');
});

test('Valid Unicode display name (e.g. Hindi)', () => {
  const res = validateDisplayName('आरव शर्मा');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.name, 'आरव शर्मा');
});

test('Valid display name with dots and hyphens', () => {
  const res = validateDisplayName('J. Doe-Smith');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.name, 'J. Doe-Smith');
});

test('Valid name with single trailing newline', () => {
  const res = validateDisplayName('Aarav Sharma\n');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.name, 'Aarav Sharma');
});

test('Reject empty content', () => {
  const res1 = validateDisplayName('');
  assert.strictEqual(res1.valid, false);
  const res2 = validateDisplayName('   \n\n');
  assert.strictEqual(res2.valid, false);
});

test('Reject multiple lines', () => {
  const res = validateDisplayName('Aarav Sharma\nAnother Line');
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('ONE line')));
});

test('Reject names exceeding 30 characters', () => {
  const longName = 'A'.repeat(31);
  const res = validateDisplayName(longName);
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('too long')));
});

test('Accept names up to 30 characters', () => {
  const maxName = 'A'.repeat(30);
  const res = validateDisplayName(maxName);
  assert.strictEqual(res.valid, true);
});

test('Reject HTML tags like <b>x</b>', () => {
  const res = validateDisplayName('<b>Aarav</b>');
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('HTML')));
});

test('Reject script injection or code characters', () => {
  const res = validateDisplayName('<script>alert(1)</script>');
  assert.strictEqual(res.valid, false);
});

test('Reject names without letters (only symbols/spaces)', () => {
  const res = validateDisplayName('--- ...');
  assert.strictEqual(res.valid, false);
});

// 3. Combined validateFile tests
test('Valid file combination', () => {
  const res = validateFile('contributors/student-dev.txt', 'Student Developer\n', 'student-dev');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.username, 'student-dev');
  assert.strictEqual(res.name, 'Student Developer');
});

test('Invalid file with bad name and bad filename returns all errors', () => {
  const res = validateFile('../wrong.json', '<b>Name</b>\nSecond line', 'student-dev');
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.length >= 2);
});

console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
