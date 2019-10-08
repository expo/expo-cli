#!/usr/bin/env node
let path = require('path');
let spawnAsync = require('@expo/spawn-async');

let lerna = path.join(__dirname, '../node_modules/.bin/lerna');

async function run() {
  await spawnAsync(lerna, ['version', ...process.argv.slice(2)], { stdio: 'inherit' });

  let packages = JSON.parse(
    (await spawnAsync(lerna, ['ls', '--toposort', '--json'], {
      stdio: ['inherit', 'pipe', 'inherit'],
    })).stdout
  );

  console.log('🔎 Looking for packages to publish');
  let toPublish = [];
  for (const { name, version, location } of packages) {
    let packageViewStdout;
    try {
      packageViewStdout = (await spawnAsync('npm', ['view', '--json', name], {
        stdio: ['inherit', 'pipe', 'inherit'],
      })).stdout;
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
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
