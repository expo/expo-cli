import latestVersionAsync from 'latest-version';
import npmPackageJson from 'package-json';
import pTimeout from 'p-timeout';
import semver from 'semver';

import { Cacher } from './FsCache';

function createModuleVersionChecker(name, currentVersion) {
  const UpdateCacher = new Cacher(
    async () => {
      const pkgJson = await npmPackageJson(name, { version: currentVersion });
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
      updateIsAvailable: semver.gt(latestVersion, currentVersion),
      latest: latestVersion,
      current: currentVersion,
      deprecated,
    };
  }

  return { checkAsync };
}

export { createModuleVersionChecker };
