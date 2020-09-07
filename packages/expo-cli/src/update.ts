import * as PackageManager from '@expo/package-manager';
import boxen from 'boxen';
import checkForUpdate from 'update-check';

import log from './log';

// We use require() to exclude package.json from TypeScript's analysis since it lives outside the
// src directory and would change the directory structure of the emitted files under the build
// directory
const packageJSON = require('../package.json');

export default async function shouldUpdate(): Promise<void> {
  const update = checkForUpdate(packageJSON, { interval: 1 }).catch(() => null);

  try {
    const res = await update;
    // TODO: Deprecated support?
    if (res?.latest) {
      const isYarn = PackageManager.shouldUseYarn();

      log.nestedWarn(
        boxen(
          log.chalk.reset(
            `A new version of ${log.chalk.bold(packageJSON.name)} is available (${
              res.latest
            })\nYou can update by running: ${log.chalk.cyan(
              isYarn ? `yarn global add ${packageJSON.name}` : `npm install -g ${packageJSON.name}`
            )}`
          ),
          { borderColor: 'green', dimBorder: true, padding: 1 }
        )
      );
    }
  } catch {
    // ignore error
  }
}
