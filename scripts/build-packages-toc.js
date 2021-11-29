#!/usr/bin/env node
const fs = require('fs-extra');
const path = require('path');

/**
 * @param {string} cell
 * @param {number} width
 * @returns {string}
 */
function padCell(cell, width) {
  const padsCount = width - cell.length;
  return cell + ' '.repeat(padsCount);
}

/**
 * @param {string[]} elements
 */
function getMaxWidth(elements) {
  return elements.reduce((acc, el) => Math.max(acc, el.length), 0);
}

let firstCellMaxWidth = null;
let secondCellMaxWidth = null;

/**
 * @param {[string, string]} entries - one row cells contents
 * @param {number} idx
 * @param {[string, string][]} entriesArray
 * @returns {string} resulting markdown table row with cells with padded content
 */
function convertToCells([firstCell, secondCell], idx, entriesArray) {
  firstCellMaxWidth =
    firstCellMaxWidth !== null ? firstCellMaxWidth : getMaxWidth(entriesArray.map(el => el[0]));
  secondCellMaxWidth =
    secondCellMaxWidth !== null ? secondCellMaxWidth : getMaxWidth(entriesArray.map(el => el[1]));

  const result = `| ${padCell(firstCell, firstCellMaxWidth)} | ${padCell(
    secondCell,
    secondCellMaxWidth
  )} |`;
  return result;
}

async function run() {
  const pkgsPath = path.join(__dirname, '..', 'packages');
  const contents = await fs.readdir(pkgsPath);

  const lines = [`\n<!-- Begin auto-generation -->\n`];
  const entries = [
    ['Package', 'Version'],
    ['---', '---'],
  ];
  for (const pkg of contents) {
    try {
      const pkgJson = require(path.join(pkgsPath, pkg, 'package.json'));

      const repoLink = `./packages/${pkg}`;

      // const codecovLink = `https://codecov.io/gh/expo/expo-cli/tree/main/packages/${pkg}/src`;
      // const codecovIcon = `https://codecov.io/gh/expo/expo-cli/branch/main/graph/badge.svg?flag=${toCamel(
      //   pkg
      // )}`;

      const npmLink = `https://www.npmjs.com/package/${pkgJson.name}`;
      const npmIcon = `https://img.shields.io/npm/v/${pkgJson.name}?color=32cd32&style=flat-square`;
      // const npmItem = `[\`v${pkgJson.version}\`](${npmLink})`;
      /// With Icon, this seems to time out
      // const npmItem = `[![badges](${npmIcon})](${npmLink})`;

      // Maybe do package size too https://flat.badgen.net/packagephobia/publish/pod-install
      // Currently doesn't work with xdl or expo-cli
      entries.push([
        `[**\`${pkgJson.name}\`**](${repoLink})`,
        `[![badges](${npmIcon})](${npmLink})`,
      ]);
    } catch (e) {
      console.log(`Skipping ${pkg}`);
    }
  }

  const paddedCells = entries.map(convertToCells);

  lines.push(...paddedCells);
  lines.push(`\n<!-- Generated with $ node scripts/build-packages-toc.js -->\n`);

  console.log(`\n\n\n\n`);
  console.log(lines.join('\n'));
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
