#!/usr/bin/env node
const spawnAsync = require('@expo/spawn-async');
const path = require('path');

const lerna = path.join(__dirname, '../node_modules/.bin/lerna');
const shouldPrerelease = isPrerelease();

function isPrerelease() {
  const bumpFlagIndex = process.argv.findIndex(arg => arg === '--bump');
  const prereleaseArgIndex = process.argv.findIndex(arg => arg === 'prerelease');
  return (
    bumpFlagIndex !== -1 && prereleaseArgIndex !== -1 && bumpFlagIndex + 1 === prereleaseArgIndex
  );
}

async function run() {
  await spawnAsync(lerna, ['version', '--exact', ...process.argv.slice(2)], { stdio: 'inherit' });

  const packages = JSON.parse(
    (
      await spawnAsync(lerna, ['ls', '--toposort', '--json'], {
        stdio: ['inherit', 'pipe', 'inherit'],
      })
    ).stdout
  );

  console.log('🔎 Looking for packages to publish');
  const toPublish = [];
  for (const { name, version, location } of packages) {
    let packageViewStdout;
    try {
      packageViewStdout = (
        await spawnAsync('npm', ['view', '--json', name], {
          stdio: ['inherit', 'pipe', 'inherit'],
        })
      ).stdout;
    } catch (e) {
      const response = JSON.parse(e.stdout);
      if (response.error && response.error.code === 'E404') {
        toPublish.push({ name, location });
        console.log(`* ${name} 🆕`);
      } else {
        throw e;
      }
      continue;
    }

    const packageView = JSON.parse(packageViewStdout);
    if (!packageView.versions.includes(version)) {
      toPublish.push({ name, location, version });
      console.log(`* ${name}`);
    }
  }

  if (toPublish.length === 0) {
    console.log('✅ No packages left to publish');
    return;
  }

  for (const { name, location, version } of toPublish) {
    console.log();
    console.log('🚢 Publishing', name);
    const args = ['publish', '--access', 'public'];
    if (shouldPrerelease) {
      args.push('--tag', 'alpha');
    }
    if (name === 'expo-cli') {
      args.push('--tag', 'next');
      console.log(`  using dist-tag 'next', run 'npm dist-tag add ${name}@${version} latest'`);
      console.log(`  after testing the release to promote it to the latest tag`);
    }
    await spawnAsync('npm', args, {
      cwd: location,
      stdio: 'inherit',
    });
    console.log('✅ Published', name);
  }
  console.log('❗❗❗ Make sure CHANGELOG.md is up to date ❗❗❗');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
