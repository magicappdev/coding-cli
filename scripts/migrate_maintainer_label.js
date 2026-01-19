/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Octokit } from '@octokit/rest';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

if (!process.env.GITHUB_TOKEN) {
  console.error('Error: GITHUB_TOKEN environment variable is required.');
  process.exit(1);
}

const argv = yargs(hideBin(process.argv))
  .option('owner', {
    type: 'string',
    default: 'google-gemini',
    description: 'Repository owner',
  })
  .option('repo', {
    type: 'string',
    default: 'gemini-cli',
    description: 'Repository name',
  })
  .option('dry-run', {
    alias: 'd',
    type: 'boolean',
    default: false,
    description: 'Run without making actual changes (read-only mode)',
  })
  .help()
  .parse();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const { owner, repo, dryRun } = argv;

const OLD_LABEL = 'maintainer';
const NEW_LABEL = '🔒 maintainer only';

async function run() {
  console.log(
    `Migrating label "${OLD_LABEL}" to "${NEW_LABEL}" in ${owner}/${repo}`,
  );
  if (dryRun) {
    console.log('--- DRY RUN MODE: No changes will be made ---');
  }

  try {
    // Search for open issues with the old label
    // We use search because listing issues by label doesn't easily support "open" filter as cleanly in one go with pagination helpers sometimes,
    // but paginate on issues.listForRepo is also good. Let's use search to be precise about 'is:open label:maintainer'.
    const query = `repo:${owner}/${repo} is:issue is:open label:"${OLD_LABEL}"`;
    console.log(`Searching with query: ${query}`);

    const issues = await octokit.paginate(
      octokit.rest.search.issuesAndPullRequests,
      {
        q: query,
      },
    );

    console.log(`Found ${issues.length} issues with label "${OLD_LABEL}".`);

    for (const issue of issues) {
      console.log(`Processing issue #${issue.number}: ${issue.title}`);

      // Check if the new label already exists
      const hasNewLabel = issue.labels.some((l) => l.name === NEW_LABEL);

      try {
        if (!dryRun) {
          if (!hasNewLabel) {
            await octokit.rest.issues.addLabels({
              owner,
              repo,
              issue_number: issue.number,
              labels: [NEW_LABEL],
            });
            console.log(`  Added label "${NEW_LABEL}".`);
          } else {
            console.log(`  Label "${NEW_LABEL}" already present.`);
          }

          await octokit.rest.issues.removeLabel({
            owner,
            repo,
            issue_number: issue.number,
            name: OLD_LABEL,
          });
          console.log(`  Removed label "${OLD_LABEL}".`);
        } else {
          if (!hasNewLabel) {
            console.log(`  [DRY RUN] Would add label "${NEW_LABEL}"`);
          } else {
            console.log(
              `  [DRY RUN] Label "${NEW_LABEL}" already present (no-op add)`,
            );
          }
          console.log(`  [DRY RUN] Would remove label "${OLD_LABEL}"`);
        }
      } catch (error) {
        console.error(
          `  Failed to process issue #${issue.number}:`,
          error.message,
        );
      }
    }
  } catch (error) {
    console.error('Error migrating labels:', error.message);
    process.exit(1);
  }
}

run().catch(console.error);
