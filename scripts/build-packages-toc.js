#!/usr/bin/env node
let path = require('path');
const fs = require('fs-extra');

function kebabToSnake(str) {
  return str.replace(/-/g, '_');
}

async function run() {
  const pkgsPath = path.join(__dirname, '..', 'packages');
  const contents = await fs.readdir(pkgsPath);

  let entries = [
    `\n<!-- Begin auto-generation -->\n`,
    '| Package | Coverage | Version |',
    '|----------|---------|--------|',
  ];
  for (const pkg of contents) {
    try {
      const pkgJson = require(path.join(pkgsPath, pkg, 'package.json'));

      const npmLink = `https://www.npmjs.com/package/${pkgJson.name}`;

      const npmIcon = `https://img.shields.io/npm/v/${pkgJson.name}.svg?style=flat-square&label=&labelColor=CB3837&color=000&logo=npm?cacheSeconds=3600`;

      const repoLink = `./packages/${pkg}`;

      const codecovLink = `https://codecov.io/gh/expo/expo-cli/tree/master/packages/${pkg}/src`;
      const codecovIcon = `https://codecov.io/gh/expo/expo-cli/branch/master/graph/badge.svg?flag=${kebabToSnake(
        pkg
      )}`;

      const npmItem = `[\`v${pkgJson.version}\`](${npmLink})`;
      /// With Icon, this seems to time out
      // const npmItem = `[![badges](${npmIcon})](${npmLink})`;

      entries.push(
        `| [**\`${pkgJson.name}\`**](${repoLink}) | [![badges](${codecovIcon})](${codecovLink}) | ${npmItem} |`
      );
    } catch (e) {
      console.log(`Skipping ${pkg}`);
    }
  }

  entries.push(`\n<!-- Generated with $ node scripts/build-packages-toc.js -->\n`);

  console.log(`\n\n\n\n`);
  console.log(entries.join('\n'));
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
