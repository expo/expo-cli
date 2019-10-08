import { ExpoConfig, getWebOutputPath, readConfigJson, readConfigJsonAsync } from '@expo/config';
import findWorkspaceRoot from 'find-yarn-workspace-root';
import fs from 'fs';
import path from 'path';
import url from 'url';

import { Environment, FilePaths } from '../types';
import getMode from './getMode';

const possibleMainFiles = [
  'index.web.ts',
  'index.ts',
  'index.web.tsx',
  'index.tsx',
  'src/index.web.ts',
  'src/index.ts',
  'src/index.web.tsx',
  'src/index.tsx',
  'index.web.js',
  'index.js',
  'index.web.jsx',
  'index.jsx',
  'src/index.web.js',
  'src/index.js',
  'src/index.web.jsx',
  'src/index.jsx',
];

function ensureSlash(inputPath: string, needsSlash: boolean): string {
  const hasSlash = inputPath.endsWith('/');
  if (hasSlash && !needsSlash) {
    return inputPath.substr(0, inputPath.length - 1);
  } else if (!hasSlash && needsSlash) {
    return `${inputPath}/`;
  } else {
    return inputPath;
  }
}

export function getAbsolutePathWithProjectRoot(
  projectRoot: string,
  ...pathComponents: string[]
): string {
  // Simple check if we are dealing with an URL
  if (pathComponents && pathComponents.length === 1 && pathComponents[0].startsWith('http')) {
    return pathComponents[0];
  }

  return path.resolve(projectRoot, ...pathComponents);
}

export function getPossibleProjectRoot(): string {
  return fs.realpathSync(process.cwd());
}

export function getModulesPath(projectRoot: string): string {
  const workspaceRoot = findWorkspaceRoot(path.resolve(projectRoot)); // Absolute path or null
  if (workspaceRoot) {
    return path.resolve(workspaceRoot, 'node_modules');
  }

  return path.resolve(projectRoot, 'node_modules');
}

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
    appMain: getEntryPoint(inputProjectRoot),
    modules: modulesPath,
    servedPath: getServedPath(inputProjectRoot),
    template: {
      get: templatePath,
      folder: templatePath(),
      indexHtml: templatePath('index.html'),
      manifest: templatePath('manifest.json'),
      serveJson: templatePath('serve.json'),
      favicon: templatePath('favicon.ico'),
    },
    production: {
      get: getProductionPath,
      folder: getProductionPath(),
      indexHtml: getProductionPath('index.html'),
      manifest: getProductionPath('manifest.json'),
      serveJson: getProductionPath('serve.json'),
      favicon: getProductionPath('favicon.ico'),
    },
  };
}

export function getEntryPoint(projectRoot: string): string | null {
  const { exp, pkg } = readConfigJson(projectRoot, true);

  /**
   *  The main file is resolved like so:
   * * `app.json` -> `expo.entryPoint`
   * * `package.json` -> `"main"`
   * * `possibleMainFiles`
   */
  if (exp && exp.entryPoint && typeof exp.entryPoint === 'string') {
    return getAbsolutePathWithProjectRoot(projectRoot, exp.entryPoint);
  } else if (pkg) {
    const { main } = pkg;
    if (main && typeof main === 'string') {
      return getAbsolutePathWithProjectRoot(projectRoot, main);
    }
    // Adds support for create-react-app (src/index.js) and react-native-cli (index.js) which don't define a main.
    for (const fileName of possibleMainFiles) {
      const filePath = getAbsolutePathWithProjectRoot(projectRoot, fileName);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
  }
  return null;
}

export function getPaths(projectRoot: string): FilePaths {
  const { exp } = readConfigJson(projectRoot, true);
  return parsePaths(projectRoot, exp);
}

export async function getPathsAsync(projectRoot: string): Promise<FilePaths> {
  let exp;
  try {
    exp = (await readConfigJsonAsync(projectRoot, true)).exp;
  } catch (error) {}
  return parsePaths(projectRoot, exp);
}

export function getServedPath(projectRoot: string): string {
  const { pkg } = readConfigJson(projectRoot, true);
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
  const { exp, pkg } = readConfigJson(projectRoot, true);
  return getAbsolutePathWithProjectRoot(projectRoot, getWebOutputPath(exp));
}
