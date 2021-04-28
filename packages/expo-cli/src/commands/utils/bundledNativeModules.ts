import JsonFile from '@expo/json-file';
import resolveFrom from 'resolve-from';
import { ApiV2 } from 'xdl';

import CommandError from '../../CommandError';
import Log from '../../log';

interface NativeModule {
  npmPackage: string;
  versionRange: string;
}
type BundledNativeModuleList = NativeModule[];
type BundledNativeModules = Record<string, string>;

export async function getBundledNativeModulesAsync(
  projectRoot: string,
  sdkVersion: string
): Promise<BundledNativeModules> {
  try {
    return await getBundledNativeModulesFromApiAsync(sdkVersion);
  } catch {
    Log.warn(
      `There seem to be a transient problem with Expo servers, using the cached dependency map (${Log.chalk.bold(
        'bundledNativeModules.json'
      )}) from the package "${Log.chalk.bold`expo`}" installed in your project.`
    );
    return await getBundledNativeModulesFromExpoPackageAsync(projectRoot);
  }
}

async function getBundledNativeModulesFromApiAsync(
  sdkVersion: string
): Promise<BundledNativeModules> {
  const client = ApiV2.clientForUser();
  const list = await client.getAsync(`sdks/${sdkVersion}/native-modules`);
  if (list.length === 0) {
    throw new Error('The bundled native module list from www is empty');
  }
  return fromBundledNativeModuleList(list);
}

async function getBundledNativeModulesFromExpoPackageAsync(
  projectRoot: string
): Promise<BundledNativeModules> {
  const bundledNativeModulesPath = resolveFrom.silent(
    projectRoot,
    'expo/bundledNativeModules.json'
  );
  if (!bundledNativeModulesPath) {
    Log.addNewLineIfNone();
    throw new CommandError(
      `The dependency map ${Log.chalk.bold(
        `expo/bundledNativeModules.json`
      )} cannot be found, please ensure you have the package "${Log.chalk
        .bold`expo`}" installed in your project.\n`
    );
  }
  return await JsonFile.readAsync<BundledNativeModules>(bundledNativeModulesPath);
}

function fromBundledNativeModuleList(list: BundledNativeModuleList): BundledNativeModules {
  return list.reduce((acc, i) => {
    acc[i.npmPackage] = i.versionRange;
    return acc;
  }, {} as BundledNativeModules);
}
