/**
 * @flow
 */

import child_process from 'mz/child_process';
import JsonFile from '@expo/json-file';
import path from 'path';
import semver from 'semver';

import { FsCache, UserSettings } from 'xdl';

const UpdateCacher = new FsCache.Cacher(
  async () => {
    const packageName = await new JsonFile(path.join(__dirname, '..', 'package.json')).getAsync(
      'name'
    );
    const [version_, _] = await child_process.exec(`npm view ${packageName} version`);
    const trimmed = version_.trim();

    return {
      latestVersionExp: trimmed,
    };
  },
  'exp-updates.json',
  24 * 60 * 60 * 1000 // one day
);

async function currentExpVersionAsync() {
  return new JsonFile(path.join(__dirname, '..', 'package.json')).getAsync('version');
}

async function checkForExpUpdateAsync(): Promise<{
  state: 'out-of-date' | 'up-to-date' | 'ahead-of-published',
  current: string,
  latest: string,
}> {
  const current = await currentExpVersionAsync();

  // check for an outdated install based on either a fresh npm query or our cache
  const { latestVersionExp: latest } = await UpdateCacher.getAsync();

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
      throw new Error('Confused about whether exp is up-to-date or not');
  }

  return {
    state,
    current,
    latest,
  };
}

export default {
  currentExpVersionAsync,
  checkForExpUpdateAsync,
};
