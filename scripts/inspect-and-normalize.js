const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const CONTRIBUTORS_DIR = path.join(ROOT_DIR, 'contributors');

// Mapping of PR author to the file they committed in their PR
const prMappings = [
  { pr: 48, author: 'rosdiary1', file: 'contributor-rosdiary1.tht' },
  { pr: 47, author: 'arindam-hue', file: 'contributors/arindam-hue.txt' },
  { pr: 46, author: 'kinematics901-png', file: 'contributors/kinematics901-png.txt' },
  { pr: 45, author: 'bhavishyadav1750-netizen', file: 'contributers/bhavishyaaa-web.tht' },
  { pr: 44, author: '31shreyapandey', file: 'contributers/31shreyapandey.txt' },
  { pr: 43, author: 'atharvaaa-web', file: 'contributors/atharvaaa-web.tht' },
  { pr: 42, author: 'rupall-cynk', file: 'contributors/rupall-cynk.txt' },
  { pr: 40, author: 'Rishikaa1234', file: 'Rishikaa1234.txt' },
  { pr: 39, author: 'arunbharti10oct2005-ui', file: 'arunbharti10oct2005-ui.txt' },
  { pr: 38, author: 'muskangiri', file: 'Muskaninder.text' },
  { pr: 37, author: 'Chandniahirwar', file: 'Chandniahirwar.txt' },
  { pr: 36, author: 'kavyashri0904', file: 'kavyashri0904.txt' },
  { pr: 35, author: 'KushagraMishra-20', file: 'Kushagra.txt' },
  { pr: 34, author: 'abhishek0008847', file: 'Abhishek' },
  { pr: 33, author: 'Samartggits', file: 'Samarth' },
  { pr: 32, author: 'parasjain16', file: 'parasjain16.txt' },
  { pr: 31, author: 'pourvikarathore308', file: 'Pourvika.txt' },
  { pr: 30, author: 'amanpatel19', file: 'Amanpatel.txt' },
  { pr: 29, author: 'palakrajwanshi', file: 'palak.txt' },
  { pr: 28, author: 'prafull-singour-08', file: 'prafull-singour-08.txt' },
  { pr: 27, author: 'dipanshupatel473-git', file: 'Dipanshu.txt' },
  { pr: 26, author: 'aabhar87455', file: 'aabhar87455txt' },
  { pr: 25, author: 'rupalishrivas876-r', file: 'Rupali.txt' },
  { pr: 24, author: 'Rudransh82', file: 'Rudransh.txt' },
  { pr: 23, author: 'abhinaypandey482-git', file: 'Abhinaypandey.txt' },
  { pr: 22, author: 'PreetJassal10', file: 'PreetInder.txt' },
  { pr: 21, author: 'Bhanu-6232', file: 'Bhanu-6232.txt' },
  { pr: 20, author: 'piyush8217', file: 'Piyushgupta.txt' },
  { pr: 19, author: 'vineetjain20007-glitch', file: 'Ankitajain.txt' },
  { pr: 18, author: 'ParmarRajveer21', file: 'ParmarRajveer21' },
  { pr: 17, author: 'ayanmodii', file: 'contributors/ayanmodii' },
  { pr: 16, author: 'ashwitnarang2007-coder', file: 'contributors/ashwitnarang2007-coder.txt' },
  { pr: 15, author: 'SamarthNayakAIML', file: 'SamarthNayakAIML.txt' },
  { pr: 14, author: 'Anjali-4Sharma', file: 'Anjali-4Sharma.txt' },
  { pr: 13, author: 'pachoriakshita19-dev', file: 'contributors/pachoriakshita19-dev.txt' },
  { pr: 12, author: 'vishwakarmaamie-cloud', file: 'contributor/vishwakarmaamie.txt' },
  { pr: 11, author: 'chetansanodiya', file: 'contributor/chetansanodiya.txt' },
  { pr: 10, author: 'Ankitboy00008', file: 'contributors/Ankitboy00008.txt' },
  { pr: 8, author: 'jainanzel2007-eng', file: 'contributors/jainanzel2007-eng.txt' },
  { pr: 7, author: 'Pranjal9399', file: 'contributor/pranjal9399.txt' },
  { pr: 6, author: 'mks-tech1', file: 'contributors/mks-tech1' },
  { pr: 5, author: 'sahilkum785688-stack', file: 'Contributors/sahilkum785688-stack.txt' },
  { pr: 4, author: '111shivamrai', file: 'contributers/111shivamrai.txt' }
];

console.log('--- Processing All PRs into contributors/<username>.txt ---');

for (const item of prMappings) {
  const author = item.author;
  const rawFilePath = path.join(ROOT_DIR, item.file);

  let rawContent = '';
  if (fs.existsSync(rawFilePath)) {
    rawContent = fs.readFileSync(rawFilePath, 'utf8');
  }

  // Extract clean display name
  const lines = rawContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  let displayName = lines[0] || '';

  // Clean any markdown, quotes, or accidental symbols
  displayName = displayName.replace(/[#*`"']/g, '').trim();

  // If student didn't write a proper name or file was empty, use a clean version of author/filename
  if (!displayName || displayName.length < 2) {
    const fallback = path.basename(item.file).replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    displayName = fallback.replace(/\b\w/g, c => c.toUpperCase());
  }

  // Truncate to max 30 chars
  if (displayName.length > 30) {
    displayName = displayName.substring(0, 30).trim();
  }

  // Ensure clean format
  const normalizedFile = path.join(CONTRIBUTORS_DIR, `${author.toLowerCase()}.txt`);
  fs.writeFileSync(normalizedFile, displayName + '\n', 'utf8');
  console.log(`[PR #${item.pr}] @${author} => "${displayName}"`);
}

// Clean up stray files in ROOT or misnamed folders
const strayFilesToDelete = [
  'contributor-rosdiary1.tht',
  'Rishikaa1234.txt',
  'arunbharti10oct2005-ui.txt',
  'Muskaninder.text',
  'Chandniahirwar.txt',
  'kavyashri0904.txt',
  'Kushagra.txt',
  'Abhishek',
  'Samarth',
  'parasjain16.txt',
  'Pourvika.txt',
  'Amanpatel.txt',
  'palak.txt',
  'prafull-singour-08.txt',
  'Dipanshu.txt',
  'aabhar87455txt',
  'Rupali.txt',
  'Rudransh.txt',
  'Abhinaypandey.txt',
  'PreetInder.txt',
  'Bhanu-6232.txt',
  'Piyushgupta.txt',
  'Ankitajain.txt',
  'ParmarRajveer21',
  'SamarthNayakAIML.txt',
  'Anjali-4Sharma.txt',
  'contributors/atharvaaa-web.tht',
  'contributors/ayanmodii',
  'contributors/mks-tech1'
];

for (const f of strayFilesToDelete) {
  const full = path.join(ROOT_DIR, f);
  if (fs.existsSync(full)) {
    try {
      execSync(`git rm -f "${f}"`, { cwd: ROOT_DIR, stdio: 'ignore' });
    } catch {
      try { fs.unlinkSync(full); } catch {}
    }
  }
}

// Remove misnamed directories if they exist
const strayDirs = ['contributers', 'contributor', 'Contributors'];
for (const d of strayDirs) {
  const full = path.join(ROOT_DIR, d);
  if (fs.existsSync(full)) {
    try {
      execSync(`git rm -rf "${d}"`, { cwd: ROOT_DIR, stdio: 'ignore' });
    } catch {
      try { fs.rmSync(full, { recursive: true, force: true }); } catch {}
    }
  }
}

console.log('\n--- Normalization Complete! ---');
