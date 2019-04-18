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
    const packageView = JSON.parse(
      (await spawnAsync('npm', ['view', '--json', name], {
        stdio: ['inherit', 'pipe', 'inherit'],
      })).stdout
    );
    if (!packageView.versions.includes(version)) {
      toPublish.push({ name, location });
      console.log(`* ${name}`);
    }
  }

  if (toPublish.length === 0) {
    console.log('✅ No packages left to publish');
    return;
  }

  for (const { name, location } of toPublish) {
    console.log();
    console.log('🚢 Publishing', name);
    await spawnAsync('npm', ['publish', '--access', 'public'], {
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
