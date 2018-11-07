import latestVersionAsync from 'latest-version';
import pTimeout from 'p-timeout';
import semver from 'semver';

import { Cacher } from './FsCache';

function createModuleVersionChecker(name, currentVersion) {
  const UpdateCacher = new Cacher(
    async () => {
      return { latestVersion: await pTimeout(latestVersionAsync(name), 2000) };
    },
    `${name}-updates.json`,
    24 * 60 * 60 * 1000 // one day
  );

  async function checkAsync() {
    const { latestVersion } = await UpdateCacher.getAsync();
    return {
      updateIsAvailable: semver.gt(latestVersion, currentVersion),
      latest: latestVersion,
      current: currentVersion,
    };
  }

  return { checkAsync };
}

export { createModuleVersionChecker };
