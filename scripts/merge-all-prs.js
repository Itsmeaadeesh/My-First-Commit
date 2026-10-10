const { execSync } = require('child_process');

const creds = execSync('git credential fill', {
  input: 'protocol=https\nhost=github.com\nusername=Itsmeaadeesh\n',
  encoding: 'utf8'
});
const token = creds.match(/password=(.+)/)[1].trim();

async function mergeAllPRs() {
  const prsRes = await fetch('https://api.github.com/repos/Itsmeaadeesh/My-First-Commit/pulls?state=open&per_page=100', {
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Node'
    }
  });
  const prs = await prsRes.json();
  console.log(`Found ${prs.length} open PRs to merge.`);

  let mergedCount = 0;
  let failedCount = 0;

  for (const pr of prs) {
    const prNumber = pr.number;
    const author = pr.user.login;
    const title = pr.title;

    console.log(`Merging PR #${prNumber} by @${author} ("${title}")...`);
    try {
      const mergeRes = await fetch(`https://api.github.com/repos/Itsmeaadeesh/My-First-Commit/pulls/${prNumber}/merge`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Node',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merge_method: 'squash',
          commit_title: `feat(contributors): add @${author} (#${prNumber})`
        })
      });

      const resJson = await mergeRes.json();
      if (mergeRes.ok && resJson.merged) {
        console.log(`  ✓ Successfully merged PR #${prNumber}`);
        mergedCount++;
      } else {
        console.warn(`  ✗ Failed to merge PR #${prNumber}: ${resJson.message}`);
        failedCount++;
      }
    } catch (e) {
      console.error(`  ✗ Error merging PR #${prNumber}:`, e.message);
      failedCount++;
    }
    // Small delay between merges to prevent rate limits
    await new Promise(r => setTimeout(r, 600));
  }

  console.log(`\nMerge summary: ${mergedCount} merged, ${failedCount} failed.`);
}

mergeAllPRs().catch(console.error);
