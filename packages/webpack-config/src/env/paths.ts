/* eslint-env node */

import { ExpoConfig, getWebOutputPath, readConfigJson, readConfigJsonAsync } from '@expo/config';
import fs from 'fs';
import path from 'path';
import url from 'url';

import {
  ensureSlash,
  getAbsolutePathWithProjectRoot,
  getEntryPoint,
  getModulesPath,
  getPossibleProjectRoot,
} from '@expo/config/paths';
import { Environment, FilePaths } from '../types';
import getMode from './getMode';

function parsePaths(projectRoot: string, nativeAppManifest?: ExpoConfig): FilePaths {
  const inputProjectRoot = projectRoot || getPossibleProjectRoot();

  function absolute(...pathComponents: string[]): string {
    return getAbsolutePathWithProjectRoot(inputProjectRoot, ...pathComponents);
  }

  const packageJsonPath = absolute('package.json');
  const modulesPath = getModulesPath(inputProjectRoot);
  const productionPath = absolute(getWebOutputPath(nativeAppManifest));

  function templatePath(filename: string = ''): string {
    const overridePath = absolute('web', filename);
    if (fs.existsSync(overridePath)) {
      return overridePath;
    }
    return path.join(__dirname, '../../web-default', filename);
  }

  function getProductionPath(...props: string[]): string {
    return path.resolve(productionPath, ...props);
  }

  function getIncludeModule(...props: string[]): string {
    return path.resolve(modulesPath, ...props);
  }

  return {
    absolute,
    includeModule: getIncludeModule,
    packageJson: packageJsonPath,
    root: path.resolve(inputProjectRoot),
    appMain: getEntryPoint(inputProjectRoot, ['./index', './src/index'], ['web']),
    modules: modulesPath,
    servedPath: getServedPath(inputProjectRoot),
    template: {
      get: templatePath,
      folder: templatePath(),
      indexHtml: templatePath('index.html'),
      manifest: templatePath('manifest.json'),
      serveJson: templatePath('serve.json'),
      favicon: templatePath('favicon.ico'),
      serviceWorker: templatePath('expo-service-worker.js'),
      registerServiceWorker: templatePath('register-service-worker.js'),
    },
    production: {
      get: getProductionPath,
      folder: getProductionPath(),
      indexHtml: getProductionPath('index.html'),
      manifest: getProductionPath('manifest.json'),
      serveJson: getProductionPath('serve.json'),
      favicon: getProductionPath('favicon.ico'),
      serviceWorker: getProductionPath('expo-service-worker.js'),
      registerServiceWorker: getProductionPath('register-service-worker.js'),
    },
  };
}

/**
 * Sync method for getting default paths used throughout the Webpack config.
 * This is useful for Next.js which doesn't support async Webpack configs.
 *
 * @param projectRoot
 * @category env
 */
export function getPaths(projectRoot: string): FilePaths {
  const { exp } = readConfigJson(projectRoot, true, true);
  return parsePaths(projectRoot, exp);
}

/**
 * Async method for getting default paths used throughout the Webpack config.
 *
 * @param projectRoot
 * @category env
 */
export async function getPathsAsync(projectRoot: string): Promise<FilePaths> {
  let exp;
  try {
    exp = (await readConfigJsonAsync(projectRoot, true, true)).exp;
  } catch (error) {}
  return parsePaths(projectRoot, exp);
}

/**
 * Get paths dictating where the app is served regardless of the current Webpack mode.
 *
 * @param projectRoot
 * @category env
 */
export function getServedPath(projectRoot: string): string {
  const { pkg } = readConfigJson(projectRoot, true, true);
  const envPublicUrl = process.env.WEB_PUBLIC_URL;

  // We use `WEB_PUBLIC_URL` environment variable or "homepage" field to infer
  // "public path" at which the app is served.
  // Webpack needs to know it to put the right <script> hrefs into HTML even in
  // single-page apps that may serve index.html for nested URLs like /todos/42.
  // We can't use a relative path in HTML because we don't want to load something
  // like /todos/42/static/js/bundle.7289d.js. We have to know the root.
  const publicUrl = envPublicUrl || pkg.homepage;
  const servedUrl = envPublicUrl || (publicUrl ? url.parse(publicUrl).pathname : '/');
  return ensureSlash(servedUrl!, true);
}

/**
 * Get paths dictating where the app is served. In development mode this returns default values.
 *
 * @param env
 * @category env
 */
export function getPublicPaths({
  projectRoot,
  ...env
}: Pick<Environment, 'mode' | 'projectRoot'>): {
  /**
   * Webpack uses `publicPath` to determine where the app is being served from.
   * It requires a trailing slash, or the file assets will get an incorrect path.
   * In development, we always serve from the root. This makes config easier.
   */
  publicPath: string;

  /**
   * `publicUrl` is just like `publicPath`, but we will provide it to our app
   * as %WEB_PUBLIC_URL% in `index.html` and `process.env.WEB_PUBLIC_URL` in JavaScript.
   * Omit trailing slash as %WEB_PUBLIC_URL%/xyz looks better than %WEB_PUBLIC_URL%xyz.
   */
  publicUrl: string;
} {
  if (getMode(env) === 'production') {
    const publicPath = getServedPath(projectRoot);
    return {
      publicPath,
      publicUrl: publicPath.slice(0, -1),
    };
  }

  return { publicUrl: '', publicPath: '/' };
}

/**
 * Get the output folder path. Defaults to `web-build`.
 *
 * @param projectRoot
 * @category env
 */
export function getProductionPath(projectRoot: string): string {
  const { exp } = readConfigJson(projectRoot, true, true);
  return getAbsolutePathWithProjectRoot(projectRoot, getWebOutputPath(exp));
}

/**
 * Get an absolute path relative to the project root while accounting for remote paths (`https://`).
 *
 * @param projectRoot
 * @category env
 */
export function getAbsolute(projectRoot: string, ...pathComponents: string[]): string {
  const inputProjectRoot = projectRoot || getPossibleProjectRoot();
  return getAbsolutePathWithProjectRoot(inputProjectRoot, ...pathComponents);
}
