// @flow

import spawnAsync from '@expo/spawn-async';
import commandExists from 'command-exists';
import fs from 'fs-extra';
import path from 'path';

import logger from './Logger';

type InstallResult = {
  code: number,
  command: string,
  args: Array<string>,
};

export default async function installPackagesAsync(
  projectDir: string,
  packages: string[],
  options?: any = {}
): Promise<void> {
  let packageManager = 'npm';
  if (options.packageManager) {
    packageManager = options.packageManager;
  } else {
    const packageLockJsonExists: boolean = await fs.pathExists(
      path.join(projectDir, 'package-lock.json')
    );
    const yarnExists = await commandExists('yarnpkg');
    packageManager = yarnExists && !packageLockJsonExists ? 'yarn' : 'npm';
  }

  if (packageManager == 'yarn') {
    logger.info(`Installing dependencies using Yarn...`);
    await spawnAsync('yarnpkg', ['add', '--silent', ...packages], {
      cwd: projectDir,
      stdio: 'inherit',
    });
  } else {
    logger.info(`Installing dependencies using npm...`);
    if (!(await fs.pathExists(path.join(projectDir, 'node_modules')))) {
      await spawnAsync('npm', ['install', '--loglevel', 'error'], {
        cwd: projectDir,
        stdio: 'inherit',
      });
    }
    await spawnAsync('npm', ['install', '--save', '--loglevel', 'error', ...packages], {
      cwd: projectDir,
      stdio: 'inherit',
    });
  }
}
