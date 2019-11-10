import { ExpoConfig, getWebOutputPath, readConfigJson, readConfigJsonAsync } from '@expo/config';
import fs from 'fs';
import path from 'path';
import url from 'url';

import { Environment, FilePaths } from '../types';
import getMode from './getMode';

import {
  getPossibleProjectRoot,
  ensureSlash,
  getModulesPath,
  getEntryPoint,
  getAbsolutePathWithProjectRoot,
} from '@expo/config/build/paths';

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

export function getPaths(projectRoot: string): FilePaths {
  const { exp } = readConfigJson(projectRoot, true, true);
  return parsePaths(projectRoot, exp);
}

export async function getPathsAsync(projectRoot: string): Promise<FilePaths> {
  let exp;
  try {
    exp = (await readConfigJsonAsync(projectRoot, true, true)).exp;
  } catch (error) {}
  return parsePaths(projectRoot, exp);
}

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

export function getPublicPaths({
  projectRoot,
  ...env
}: Environment): {
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

export function getProductionPath(projectRoot: string): string {
  const { exp } = readConfigJson(projectRoot, true, true);
  return getAbsolutePathWithProjectRoot(projectRoot, getWebOutputPath(exp));
}
