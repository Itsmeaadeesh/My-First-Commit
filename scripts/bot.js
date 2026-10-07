/**
 * scripts/bot.js
 * Standalone Live Auto-Merge & Contributor Bot for GitHub Dev Days.
 * 
 * Runs locally on the organizer's machine during the event.
 * Continuously monitors open student PRs, validates them using validate.js,
 * merges valid PRs, rebuilds contributors.json, and pushes to GitHub.
 * 
 * Zero dependencies, plain Node 20+.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { validateDisplayName } = require('./validate');
const { buildContributors } = require('./build-contributors');

const REPO_OWNER = 'Itsmeaadeesh';
const REPO_NAME = 'My-First-Commit';
const ROOT_DIR = path.resolve(__dirname, '..');
const POLL_INTERVAL_MS = 5000;

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;

  try {
    const creds = execSync('git credential fill', {
      input: `protocol=https\nhost=github.com\nusername=${REPO_OWNER}\n`,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const match = creds.match(/password=(.+)/);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
  } catch {}

  console.error('\n❌ Error: Could not find GitHub token.');
  console.error('Please set GITHUB_TOKEN environment variable or run while logged in to git.\n');
  process.exit(1);
}

const TOKEN = getGitHubToken();

async function ghFetch(url, options = {}) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitHub-Dev-Days-Bot',
    'Authorization': `Bearer ${TOKEN}`,
    ...(options.headers || {})
  };

  const res = await fetch(`https://api.github.com${url}`, { ...options, headers });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub API ${res.status} on ${url}: ${errText}`);
  }
  return res.json();
}

async function processOpenPRs() {
  let prs = [];
  try {
    prs = await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/pulls?state=open&sort=created&direction=asc`);
  } catch (err) {
    console.error(`[${new Date().toLocaleTimeString()}] Error fetching PRs:`, err.message);
    return;
  }

  if (prs.length === 0) return;

  for (const pr of prs) {
    if (pr.draft) continue;

    const prNumber = pr.number;
    const author = pr.user.login;
    const headSha = pr.head.sha;
    const headRepoOwner = pr.head.repo.owner.login;
    const headRepoName = pr.head.repo.name;

    console.log(`\n[${new Date().toLocaleTimeString()}] 🔎 Inspecting PR #${prNumber} from @${author}...`);

    const errors = [];

    // 1. List files
    let files = [];
    try {
      files = await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${prNumber}/files`);
    } catch (e) {
      console.error(`Failed to list files for PR #${prNumber}:`, e.message);
      continue;
    }

    if (files.length !== 1) {
      errors.push(`You must change exactly 1 file, but this PR touches ${files.length} files. Please add only your own contributor file.`);
    }

    let targetFile = null;
    if (files.length === 1) {
      const file = files[0];
      const normalizedPath = file.filename.replace(/\\/g, '/');

      if (file.status !== 'added') {
        errors.push(`File status must be "added". You cannot modify existing files.`);
      }

      const expectedPath = `contributors/${author.toLowerCase()}.txt`;
      if (normalizedPath.toLowerCase() !== expectedPath) {
        errors.push(`File must be named "contributors/${author}.txt" (found: "${file.filename}").`);
      }

      if (author.toLowerCase().startsWith('example')) {
        errors.push('Usernames starting with "example" cannot submit contributions.');
      }

      targetFile = file;
    }

    // 2. Fetch and validate content
    let displayName = '';
    if (targetFile && errors.length === 0) {
      try {
        const fileData = await ghFetch(`/repos/${headRepoOwner}/${headRepoName}/contents/${targetFile.filename}?ref=${headSha}`);
        const content = Buffer.from(fileData.content, 'base64').toString('utf8');

        const val = validateDisplayName(content);
        if (!val.valid) {
          errors.push(...val.errors);
        } else {
          displayName = val.name;
        }
      } catch (err) {
        errors.push(`Could not fetch file content: ${err.message}`);
      }
    }

    // 3. Handle validation errors
    if (errors.length > 0) {
      console.warn(`[PR #${prNumber}] ⚠️ Validation failed:\n  - ${errors.join('\n  - ')}`);
      const errorBody = `### ❌ Contribution Check Failed

Hi @${author}, thanks for submitting your pull request! We found a few issues that need to be resolved before your piece can be added to the wall:

${errors.map(e => `- ${e}`).join('\n')}

---
### 🛠️ How to fix this:
1. Open your fork.
2. Make sure you only have ONE file: \`contributors/${author}.txt\`.
3. Check that the file has only ONE line containing your display name (1–30 characters, letters/spaces/dots/hyphens only).
4. Commit your changes, and this pull request will update automatically!`;

      try {
        const comments = await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/issues/${prNumber}/comments`);
        const existing = comments.find(c => c.body.includes('Contribution Check Failed'));
        if (existing) {
          if (existing.body !== errorBody) {
            await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/issues/comments/${existing.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ body: errorBody })
            });
          }
        } else {
          await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/issues/${prNumber}/comments`, {
            method: 'POST',
            body: JSON.stringify({ body: errorBody })
          });
        }
      } catch (commentErr) {
        console.error(`Failed to post error comment on PR #${prNumber}:`, commentErr.message);
      }
      continue;
    }

    // 4. Valid PR! Comment and Merge
    console.log(`[PR #${prNumber}] ✅ Valid submission from @${author} ("${displayName}")! Merging...`);

    const welcomeMsg = `Welcome aboard, **${displayName}**! Your piece is on the wall 🧩\n\nWatch it live: https://githubdevdays-first-commit.vercel.app/`;
    try {
      await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/issues/${prNumber}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: welcomeMsg })
      });
    } catch {}

    try {
      await ghFetch(`/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${prNumber}/merge`, {
        method: 'PUT',
        body: JSON.stringify({
          merge_method: 'squash',
          commit_title: `feat(contributors): add ${author} (${displayName}) (#${prNumber})`
        })
      });
      console.log(`[PR #${prNumber}] 🎉 Successfully merged!`);
    } catch (mergeErr) {
      console.error(`[PR #${prNumber}] ❌ Merge failed:`, mergeErr.message);
      continue;
    }

    // 5. Pull new commit locally, rebuild contributors.json, and push
    try {
      console.log('🔄 Syncing local repository and updating contributors.json...');
      execSync('git pull origin main', { cwd: ROOT_DIR, stdio: 'ignore' });
      buildContributors();
      execSync('git add contributors.json', { cwd: ROOT_DIR, stdio: 'ignore' });

      const diff = execSync('git diff --staged', { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
      if (diff) {
        execSync(`git commit -m "chore: add @${author} to contributors.json"`, { cwd: ROOT_DIR, stdio: 'ignore' });
        execSync(`git push "https://${REPO_OWNER}@github.com/${REPO_OWNER}/${REPO_NAME}.git" main`, { cwd: ROOT_DIR, stdio: 'ignore' });
        console.log(`🚀 contributors.json updated & pushed to GitHub! Piece for @${author} is live on the wall!`);
      }
    } catch (pushErr) {
      console.error('Failed to update and push contributors.json:', pushErr.message);
    }
  }
}

async function startBot() {
  console.log('===========================================================');
  console.log('🤖 GitHub Dev Days Auto-Merge Bot is running!');
  console.log(`Watching repository: https://github.com/${REPO_OWNER}/${REPO_NAME}`);
  console.log(`Polling every ${POLL_INTERVAL_MS / 1000} seconds. Press Ctrl+C to stop.`);
  console.log('===========================================================\n');

  while (true) {
    await processOpenPRs();
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}

startBot();
