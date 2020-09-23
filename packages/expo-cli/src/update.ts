import { FsCache } from '@expo/xdl';
import boxen from 'boxen';
import chalk from 'chalk';
import latestVersionAsync from 'latest-version';
import pTimeout from 'p-timeout';
import npmPackageJson from 'package-json';
import semver from 'semver';

import log from './log';

const packageJSON = require('../package.json');
const { name, version } = packageJSON;

const UpdateCacher = new FsCache.Cacher(
  async () => {
    const pkgJson = await pTimeout(npmPackageJson(name, { version }), 2000);
    return {
      latestVersion: await pTimeout(latestVersionAsync(name), 2000),
      deprecated: pkgJson.deprecated,
    };
  },
  `${name}-updates.json`,
  24 * 60 * 60 * 1000 // one day
);

async function checkAsync() {
  const { latestVersion, deprecated } = await UpdateCacher.getAsync();
  return {
    updateIsAvailable: semver.gt(latestVersion, version),
    latest: latestVersion,
    current: version,
    deprecated,
  };
}

/** @deprecated just use the update-check npm package */
export async function shouldUpdateAsync() {
  const { updateIsAvailable, current, latest, deprecated } = await checkAsync();
  if (updateIsAvailable) {
    log.nestedWarn(
      boxen(
        chalk.green(`There is a new version of ${name} available (${latest}).
You are currently using ${name} ${current}
Install expo-cli globally using the package manager of your choice;
for example: \`npm install -g ${name}\` to get the latest version`),
        { borderColor: 'green', padding: 1 }
      )
    );
  }

  if (deprecated) {
    log.nestedWarn(
      boxen(
        chalk.red(
          `This version of expo-cli is not supported anymore.
It's highly recommended to update to the newest version.
The API endpoints used in this version of expo-cli might not exist,
any interaction with Expo servers may result in unexpected behaviour.`
        ),
        { borderColor: 'red', padding: 1 }
      )
    );
  }
}
