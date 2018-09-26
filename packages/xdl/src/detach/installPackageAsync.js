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

export default async function installPackageAsync(
  appPath: string,
  packageName?: string,
  packageVersion?: string,
  options?: any = {}
): Promise<InstallResult> {
  const packageLockJsonExists: boolean = await fs.pathExists(
    path.join(appPath, 'package-lock.json')
  );
  const yarnExists = await commandExists('yarnpkg');
  const useYarn = yarnExists && !packageLockJsonExists;

  let command = '';
  let args = [];

  if (useYarn) {
    command = 'yarnpkg';
    if (packageName) {
      args = ['add'];
    }
  } else {
    command = 'npm';
    args = ['install', '--save'];
  }

  let pkg = packageName;
  if (pkg) {
    if (packageVersion) {
      pkg = `${pkg}@${packageVersion}`;
    }

    args.push(pkg);
  }

  const npmOrYarn = useYarn ? 'yarn' : 'npm';
  logger.info(`Installing ${pkg ? pkg : 'dependencies'} using ${npmOrYarn}...`);
  logger.info();

  let spawnOpts = {};
  if (options.silent) {
    spawnOpts.silent = true;
  } else {
    spawnOpts.stdio = 'inherit';
  }

  return spawnAsync(command, args, spawnOpts);
}
