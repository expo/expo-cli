import { ExpoConfig, getDefaultTarget } from '@expo/config';
import JsonFile, { JSONValue } from '@expo/json-file';
import memoize from 'lodash/memoize';
import resolveFrom from 'resolve-from';

const getDevClientVersion = memoize((projectRoot: string): JSONValue | undefined => {
  try {
    const devClientPackage = resolveFrom.silent(projectRoot, 'expo-dev-client/package.json');
    if (devClientPackage) {
      return JsonFile.read(devClientPackage).version;
    }
  } catch {}
  return undefined;
});

const isManaged = memoize((projectRoot: string): boolean => {
  return getDefaultTarget(projectRoot) === 'managed';
});

export default function getDevClientProperties(projectRoot: string, exp: ExpoConfig) {
  return {
    accountName: exp.currentFullName,
    devClientVersion: getDevClientVersion(projectRoot),
    isManaged: isManaged(projectRoot),
    uptimeMs: process.uptime() * 1000,
  };
}
