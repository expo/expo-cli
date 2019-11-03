import { readJson, stat, Stats } from 'fs-extra';
import { Lazy } from 'lazy-val';
import * as path from 'path';
import { getConfig } from 'read-config-file';

import { PackagerOptions } from 'electron-builder';

export interface ElectronWebpackConfigurationRenderer extends PartConfiguration {
  dll?: Array<string> | { [key: string]: any } | null;
  webpackConfig?: string | null;
  webpackDllConfig?: string | null;
  template?: string | null;
}
export interface PartConfiguration {
  sourceDirectory?: string | null;
}

export interface ElectronWebpackConfigurationMain extends PartConfiguration {
  /**
   * The extra [entry points](https://webpack.js.org/concepts/entry-points/).
   */
  extraEntries?: Array<string> | { [key: string]: string | Array<string> } | string;
  webpackConfig?: string | null;
}

export interface ElectronWebpackConfiguration {
  whiteListedModules?: Array<string>;
  externals?: Array<string>;
  electronVersion?: string;

  renderer?: ElectronWebpackConfigurationRenderer | null;
  main?: ElectronWebpackConfigurationMain | null;

  staticSourceDirectory?: string | null;
  commonSourceDirectory?: string | null;
  commonDistDirectory?: string | null;

  title?: string | boolean | null;

  projectRoot?: string | null;
}

export async function statOrNull(file: string): Promise<Stats | null> {
  return orNullIfFileNotExist(stat(file));
}

export function orNullIfFileNotExist<T>(promise: Promise<T>): Promise<T | null> {
  return orIfFileNotExist(promise, null);
}

export function orIfFileNotExist<T>(promise: Promise<T>, fallbackValue: T): Promise<T> {
  return promise.catch(e => {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') {
      return fallbackValue;
    }
    throw e;
  });
}

export function getPackageMetadata(projectRoot: string) {
  return new Lazy(() => orNullIfFileNotExist(readJson(path.join(projectRoot, 'package.json'))));
}

export interface ConfigurationRequest {
  projectRoot: string;
  packageMetadata: Lazy<{ [key: string]: any } | null> | null;
}

export async function getConfiguration(
  context: ConfigurationRequest
): Promise<PackagerOptions | null> {
  const result = await getConfig<PackagerOptions>({
    packageKey: 'electronExpo',
    configFilename: 'electron-expo',
    projectDir: context.projectRoot,
    packageMetadata: context.packageMetadata,
  });

  if (result) {
    return result.result;
  }

  return null;
}
