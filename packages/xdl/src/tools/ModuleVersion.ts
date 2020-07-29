import latestVersionAsync from 'latest-version';
import pTimeout from 'p-timeout';
import npmPackageJson from 'package-json';
import semver from 'semver';

import { Cacher } from './FsCache';

/** @deprecated just use the update-check npm package */
function createModuleVersionChecker(name: string, currentVersion: string) {
  const UpdateCacher = new Cacher(
    async () => {
      const pkgJson = await pTimeout(npmPackageJson(name, { version: currentVersion }), 2000);
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
