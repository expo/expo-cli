/* eslint-env node */
import { ExpoConfig, getConfig, getPackageJson, getWebOutputPath } from 'expo/config';
import findWorkspaceRoot from 'find-yarn-workspace-root';
import fs from 'fs';
import path from 'path';
import resolveFrom from 'resolve-from';
import url from 'url';

import { Environment, FilePaths, InputEnvironment } from '../types';
import { getBareExtensions } from './extensions';
import getMode from './getMode';

// https://github.com/facebook/create-react-app/blob/9750738cce89a967cc71f28390daf5d4311b193c/packages/react-scripts/config/paths.js#L22
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

function getPossibleProjectRoot(): string {
  return fs.realpathSync(process.cwd());
}

/** Wraps `findYarnOrNpmWorkspaceRoot` and guards against having an empty `package.json` file in an upper directory. */
function findYarnOrNpmWorkspaceRootSafe(projectRoot: string): string | null {
  try {
    return findWorkspaceRoot(projectRoot);
  } catch (error: any) {
    if (error.message.includes('Unexpected end of JSON input')) {
      return null;
    }
    throw error;
  }
}

function getAbsolutePathWithProjectRoot(projectRoot: string, ...pathComponents: string[]): string {
  // Simple check if we are dealing with a URL.
  if (pathComponents?.length === 1 && pathComponents[0].startsWith('http')) {
    return pathComponents[0];
  }

  return path.resolve(projectRoot, ...pathComponents);
}

function getModulesPath(projectRoot: string): string {
  const workspaceRoot = findYarnOrNpmWorkspaceRootSafe(path.resolve(projectRoot)); // Absolute path or null
  if (workspaceRoot) {
    return path.resolve(workspaceRoot, 'node_modules');
  }

  return path.resolve(projectRoot, 'node_modules');
}

function getPlatformExtensions(platform: string): string[] {
  if (platform === 'ios' || platform === 'android') {
    return [platform, 'native'];
  }
  return [platform];
}

function parsePaths(
  projectRoot: string,
  nativeAppManifest?: ExpoConfig,
  env: Pick<InputEnvironment, 'platform'> = {}
): FilePaths {
  const inputProjectRoot = projectRoot || getPossibleProjectRoot();

  function absolute(...pathComponents: string[]): string {
    return getAbsolutePathWithProjectRoot(inputProjectRoot, ...pathComponents);
  }

  const packageJsonPath = absolute('package.json');
  const modulesPath = getModulesPath(inputProjectRoot);
  const productionPath = absolute(getWebOutputPath(nativeAppManifest));

  function templatePath(filename: string = ''): string {
    const overridePath = absolute(env.platform ?? 'web', filename);
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

  let appMain: string | null = null;
  try {
    appMain = getEntryPoint(
      inputProjectRoot,
      ['./index', './src/index'],
      getPlatformExtensions(env.platform ?? 'web')
    );
  } catch {
    // ignore the error
  }

  return {
    absolute,
    includeModule: getIncludeModule,
    packageJson: packageJsonPath,
    root: path.resolve(inputProjectRoot),
    appMain,
    modules: modulesPath,
    servedPath: getServedPath(inputProjectRoot),
    appWebpackCache: absolute('node_modules/.cache'),
    appTsConfig: absolute('tsconfig.json'),
    appJsConfig: absolute('jsconfig.json'),
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

/**
 * Sync method for getting default paths used throughout the Webpack config.
 * This is useful for Next.js which doesn't support async Webpack configs.
 *
 * @param projectRoot
 * @category env
 */
export function getPaths(
  projectRoot: string,
  env: Pick<InputEnvironment, 'platform'> = {}
): FilePaths {
  const { exp } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });
  return parsePaths(projectRoot, exp, env);
}

/**
 * Async method for getting default paths used throughout the Webpack config.
 *
 * @param projectRoot
 * @category env
 */
export async function getPathsAsync(
  projectRoot: string,
  env: Pick<InputEnvironment, 'platform'> = {}
): Promise<FilePaths> {
  let exp;
  try {
    exp = getConfig(projectRoot, { skipSDKVersionRequirement: true }).exp;
  } catch {}
  return parsePaths(projectRoot, exp, env);
}

/**
 * Get paths dictating where the app is served regardless of the current Webpack mode.
 *
 * @param projectRoot
 * @category env
 */
export function getServedPath(projectRoot: string): string {
  const { pkg } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });
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
export function getPublicPaths(
  env: Pick<Environment, 'mode' | 'projectRoot'>
): {
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
  const parsedMode = getMode(env);
  if (parsedMode === 'production') {
    const publicPath = getServedPath(env.projectRoot);
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
  const { exp } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });
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

// Forked from https://github.com/expo/expo/blob/ae642c8a5e02103d1edbf41d1550759001d0f414/packages/%40expo/config/src/paths/paths.ts#L35

function getEntryPoint(
  projectRoot: string,
  entryFiles: string[],
  platforms: string[]
): string | null {
  const extensions = getBareExtensions(platforms);
  return getEntryPointWithExtensions(projectRoot, entryFiles, extensions);
}

// Used to resolve the main entry file for a project.
function getEntryPointWithExtensions(
  projectRoot: string,
  entryFiles: string[],
  extensions: string[]
): string {
  const pkg = getPackageJson(projectRoot);

  if (pkg) {
    // If the config doesn't define a custom entry then we want to look at the `package.json`s `main` field, and try again.
    const { main } = pkg;
    if (main && typeof main === 'string') {
      // Testing the main field against all of the provided extensions - for legacy reasons we can't use node module resolution as the package.json allows you to pass in a file without a relative path and expect it as a relative path.
      let entry = getFileWithExtensions(projectRoot, main, extensions);
      if (!entry) {
        // Allow for paths like: `{ "main": "expo/AppEntry" }`
        entry = resolveFromSilentWithExtensions(projectRoot, main, extensions);
        if (!entry)
          throw new Error(
            `Cannot resolve entry file: The \`main\` field defined in your \`package.json\` points to a non-existent path.`
          );
      }
      return entry;
    }
  }

  // Now we will start looking for a default entry point using the provided `entryFiles` argument.
  // This will add support for create-react-app (src/index.js) and react-native-cli (index.js) which don't define a main.
  for (const fileName of entryFiles) {
    const entry = resolveFromSilentWithExtensions(projectRoot, fileName, extensions);
    if (entry) return entry;
  }

  try {
    // If none of the default files exist then we will attempt to use the main Expo entry point.
    // This requires `expo` to be installed in the project to work as it will use `node_module/expo/AppEntry.js`
    // Doing this enables us to create a bare minimum Expo project.

    // TODO(Bacon): We may want to do a check against `./App` and `expo` in the `package.json` `dependencies` as we can more accurately ensure that the project is expo-min without needing the modules installed.
    return resolveFrom(projectRoot, 'expo/AppEntry');
  } catch {
    throw new Error(
      `The project entry file could not be resolved. Please define it in the \`main\` field of the \`package.json\`, create an \`index.js\`, or install the \`expo\` package.`
    );
  }
}

// Resolve from but with the ability to resolve like a bundler
function resolveFromSilentWithExtensions(
  fromDirectory: string,
  moduleId: string,
  extensions: string[]
): string | null {
  for (const extension of extensions) {
    const modulePath = resolveFrom.silent(fromDirectory, `${moduleId}.${extension}`);
    if (modulePath && modulePath.endsWith(extension)) {
      return modulePath;
    }
  }
  return resolveFrom.silent(fromDirectory, moduleId) || null;
}

// Statically attempt to resolve a module but with the ability to resolve like a bundler.
// This won't use node module resolution.
function getFileWithExtensions(
  fromDirectory: string,
  moduleId: string,
  extensions: string[]
): string | null {
  const modulePath = path.join(fromDirectory, moduleId);
  if (fs.existsSync(modulePath)) {
    return modulePath;
  }
  for (const extension of extensions) {
    const modulePath = path.join(fromDirectory, `${moduleId}.${extension}`);
    if (fs.existsSync(modulePath)) {
      return modulePath;
    }
  }
  return null;
}
