#!/usr/bin/env node

/**
 * NOTE(brentvatne):
 * This is a very rough implementation of what I've been doing manually to put the CHANGELOG together!
 * It only works well if:
 * - The most recent commit is the publish commit
 * - You pass in the hash for the first commit after the previous release, eg:
 * ` ./scripts/changelog-draft.js 10907e08 | pbcopy`
 */

const spawnAsync = require('@expo/spawn-async');
const previousRelease = process.argv[2];

if (!previousRelease) {
  console.error('Pass in the commit hash for the first commit after the previous release.');
  process.exit();
}

async function getCommitsAsync() {
  const result = await spawnAsync('git', ['log', `${previousRelease}..HEAD`, '--oneline']);
  return formatCommits(result.stdout);
}

function formatCommits(commitsStr) {
  const commits = commitsStr.split('\n');
  return commits.map(formatCommit).filter(str => str && str !== 'Publish');
}

const issuePattern = /\(#(\d+)\)/;
function formatCommit(commitStr) {
  // Remove leading commit sha
  const commitParts = commitStr.split(' ');
  commitParts.shift();
  let commitMessage = commitParts.join(' ');
  while (commitMessage.match(issuePattern)) {
    commitMessage = commitMessage.replace(
      issuePattern,
      '([#$1](https://github.com/expo/expo-cli/issues/$1))'
    );
  }

  return commitMessage;
}

async function getPublishedPackagesAsync() {
  const result = await spawnAsync('git', ['log', '--format=%s%b', '--max-count=1']);
  const commit = result.stdout;
  if (!commit.includes('Publish -')) {
    throw new Error(
      'This script only works when the most recent commit is the auto-generated publish commit'
    );
  }
  return commit
    .replace('Publish -', '')
    .replace(/\s+-/g, '')
    .split(' ')
    .filter(str => str)
    .map(str => str.trim());
}

async function getPublishInfoAsync() {
  const hashResult = await spawnAsync('git', ['log', '--format=%H', '--max-count=1']);
  const hash = hashResult.stdout.trim();
  const dateTimeResult = await spawnAsync('git', ['log', '--format=%aD', '--max-count=1']);
  const dateTime = dateTimeResult.stdout.trim();
  return { hash, dateTime };
}

async function draftChangelogAsync() {
  const commits = await getCommitsAsync();
  const publishedPackages = await getPublishedPackagesAsync();
  const publishInfo = await getPublishInfoAsync();
  console.log(`## [${publishInfo.dateTime}](https://github.com/expo/expo-cli/commit/${
    publishInfo.hash
  })

### 🛠 Breaking changes

### 🎉 New features

### 🧹 Chores

### 🐛 Bug fixes

${commits.map(commit => `- ${commit}`).join('\n')}

### 📦 Packages updated

${publishedPackages.map(pkg => `- ${pkg}`).join('\n')}
`);
}

draftChangelogAsync();
