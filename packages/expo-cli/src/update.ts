import * as PackageManager from '@expo/package-manager';
import { FsCache } from '@expo/xdl';
import boxen from 'boxen';
import chalk from 'chalk';
import latestVersionAsync from 'latest-version';
import pTimeout from 'p-timeout';
import npmPackageJson from 'package-json';
import semver from 'semver';

import log from './log';

// We use require() to exclude package.json from TypeScript's analysis since it lives outside the
// src directory and would change the directory structure of the emitted files under the build
// directory
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
  const { updateIsAvailable, latest, deprecated } = await checkAsync();
  if (updateIsAvailable) {
    const isYarn = PackageManager.shouldUseYarn();

    log.nestedWarn(
      boxen(
        log.chalk.reset(
          `A new version of ${log.chalk.bold(
            packageJSON.name
          )} is available (${latest})\nYou can update by running: ${log.chalk.cyan(
            isYarn ? `yarn global add ${packageJSON.name}` : `npm install -g ${packageJSON.name}`
          )}`
        ),
        { borderColor: 'green', dimBorder: true, padding: 1 }
      )
    );
  }

  if (deprecated) {
    log.nestedWarn(
      boxen(
        chalk.red(
          `This version of expo-cli is not supported anymore and may have compromised functionality.
You must update to the newest version.
The API endpoints used in this version of expo-cli might not exist,
any interaction with Expo servers may result in unexpected behavior.`
        ),
        { borderColor: 'red', padding: 1 }
      )
    );
  }
}
