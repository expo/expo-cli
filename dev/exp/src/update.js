/**
 * @flow
 */

import child_process from 'mz/child_process';
import JsonFile from '@expo/json-file';
import path from 'path';
import semver from 'semver';

import { FsCache, UserSettings } from 'xdl';
import packageJSON from '../package.json';

const UpdateCacher = new FsCache.Cacher(
  async () => {
    const [version, _] = await child_process.exec(`npm view ${packageJSON.name} version`);
    return {
      latestVersion: version.trim(),
    };
  },
  `${packageJSON.name}-updates.json`,
  24 * 60 * 60 * 1000 // one day
);

async function checkForUpdateAsync(): Promise<{
  state: 'out-of-date' | 'up-to-date' | 'ahead-of-published',
  current: string,
  latest: string,
}> {
  const current = packageJSON.version;

  // check for an outdated install based on either a fresh npm query or our cache
  const { latestVersion: latest } = await UpdateCacher.getAsync();

  let state;
  switch (semver.compare(current, latest)) {
    case -1:
      state = 'out-of-date';
      break;

    case 0:
      state = 'up-to-date';
      break;

    case 1:
      state = 'ahead-of-published';
      break;

    default:
      throw new Error('Confused about whether CLI is up-to-date or not');
  }

  return {
    state,
    current,
    latest,
  };
}

export default {
  checkForUpdateAsync,
};
