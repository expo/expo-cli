/**
 * @flow
 */
import latestVersionAsync from 'latest-version';
import pTimeout from 'p-timeout';
import semver from 'semver';

import { FsCache } from 'xdl';
import packageJSON from '../package.json';

const UpdateCacher = new FsCache.Cacher(
  async () => {
    return { latestVersion: await pTimeout(latestVersionAsync(packageJSON.name), 2000) };
  },
  `${packageJSON.name}-updates.json`,
  24 * 60 * 60 * 1000 // one day
);

async function checkForUpdateAsync(): Promise<{
  updateIsAvailable: boolean,
  current: string,
  latest: string,
}> {
  const current = packageJSON.version;

  // check for an outdated install based on either a fresh npm query or our cache
  const { latestVersion } = await UpdateCacher.getAsync();

  return {
    updateIsAvailable: semver.gt(latestVersion, current),
    latest: latestVersion,
    current,
  };
}

export default {
  checkForUpdateAsync,
};
