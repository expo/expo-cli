import { TransformOptions, loadPartialConfig } from '@babel/core';
import { getPossibleProjectRoot } from '@expo/config/paths';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { Rule } from 'webpack';

import { projectHasModule } from '@expo/config';
import { Environment, Mode } from '../types';
import { getConfig, getMode, getPaths } from '../env';

const getModule = (name: string) => path.join('node_modules', name);

// Only compile files from the react ecosystem.
const includeModulesThatContainPaths = [
  getModule('react-native'),
  getModule('react-navigation'),
  getModule('expo'),
  getModule('unimodules'),
  getModule('@react'),
  getModule('@expo'),
  getModule('@unimodules'),
  getModule('native-base'),
  getModule('styled-components'),
];

const excludedRootPaths = [
  '/node_modules',
  '/bower_components',
  '/.expo/',
  // Prevent transpiling webpack generated files.
  '(webpack)',
];

const parsedPackageNames: string[] = [];
// TODO: Bacon: Support internal packages. ex: react/fbjs
function packageNameFromPath(inputPath: string): string | null {
  const modules = inputPath.split('node_modules/');
  const libAndFile = modules.pop();
  if (!libAndFile) return null;
  if (libAndFile.charAt(0) === '@') {
    const [org, lib] = libAndFile.split('/');
    return org + '/' + lib;
  } else {
    const components = libAndFile.split('/');
    const first = components.shift();
    return first || null;
  }
}

function logPackage(packageName: string) {
  if (!parsedPackageNames.includes(packageName)) {
    parsedPackageNames.push(packageName);
    console.log(chalk.cyan('\nCompiling module: ' + chalk.bold(packageName)));
  }
}

function ensureRoot(possibleProjectRoot?: string): string {
  if (typeof possibleProjectRoot === 'string') {
    return path.resolve(possibleProjectRoot);
  }
  return getPossibleProjectRoot();
}

function generateCacheIdentifier(projectRoot: string, version: string = '1'): string {
  const filename = path.join(projectRoot, 'foobar.js');
  const cacheKey = `babel-cache-${version}-`;

  const partial = loadPartialConfig({
    filename,
    cwd: projectRoot,
    sourceFileName: filename,
  });

  return `${cacheKey}${JSON.stringify(partial!.options)}`;
}

/**
 * Creates a Rule for loading Application code and packages from the Expo ecosystem.
 * This method attempts to recreate how Metro loads ES modules in the `node_modules` folder.
 *
 * @param env
 * @internal
 */
export function createBabelLoaderFromEnvironment(
  env: Pick<Environment, 'babel' | 'locations' | 'projectRoot' | 'config' | 'mode' | 'platform'>
): Rule {
  const mode = getMode(env);
  const locations = env.locations || getPaths(env.projectRoot, mode);
  const appConfig = env.config || getConfig(env);

  const { build = {} } = appConfig.web;
  const { babel = {} } = build;

  return createBabelLoader({
    projectRoot: locations.root,
    mode,
    platform: env.platform,
    babelProjectRoot: babel.root || locations.root,
    verbose: babel.verbose,
    include: [...(babel.include || []), ...(env.babel?.dangerouslyAddModulePathsToTranspile || [])],
    use: babel.use,
  });
}
/**
 * A complex babel loader which uses the project's `babel.config.js`
 * to resolve all of the Unimodules which are shipped as ES modules (early 2019).
 * @category loaders
 */
export default function createBabelLoader({
  /**
   * The webpack mode: `"production" | "development"`
   */
  mode,
  projectRoot: inputProjectRoot,
  babelProjectRoot,
  include = [],
  verbose,
  platform = 'web',
  useCustom,
  ...options
}: {
  projectRoot?: string;
  useCustom?: boolean;
  mode?: Mode;
  babelProjectRoot?: string;
  include?: string[];
  verbose?: boolean;
  [key: string]: any;
} = {}): Rule {
  const ensuredProjectRoot = ensureRoot(babelProjectRoot);
  const modules = [...includeModulesThatContainPaths, ...include];
  const customUse = options.use || {};
  const customUseOptions = customUse.options || {};

  const isProduction = mode === 'production';

  const projectRoot = inputProjectRoot || getPossibleProjectRoot();
  let presetOptions: any = {
    // Explicitly use babel.config.js instead of .babelrc
    babelrc: false,
    // Attempt to use local babel.config.js file for compiling project.
    configFile: true,
  };

  if (
    !fs.existsSync(path.join(projectRoot, 'babel.config.js')) &&
    !fs.existsSync(path.join(projectRoot, '.babelrc'))
  ) {
    if (projectHasModule('babel-preset-expo', projectRoot, {})) {
      presetOptions = {
        babelrc: false,
        configFile: false,
        presets: [require.resolve('babel-preset-expo')],
      };
    } else {
      console.log(chalk.yellow('\u203A Webpack failed to locate a valid Babel config'));
    }
  }

  presetOptions = {
    ...presetOptions,
    ...(customUseOptions || {}),

    sourceType: 'unambiguous',
    root: ensuredProjectRoot,
    compact: isProduction,
  };

  let cacheIdentifier: string | undefined = customUseOptions.cacheIdentifier;
  if (!cacheIdentifier) {
    try {
      cacheIdentifier = generateCacheIdentifier(ensuredProjectRoot);
    } catch (error) {
      console.log(chalk.black.bgRed(`The project's Babel config is invalid: ${error.message}`));

      throw error;
    }
  }
  presetOptions.cacheIdentifier = cacheIdentifier;
  presetOptions.cacheCompression = false;
  presetOptions.cacheDirectory =
    customUseOptions.cacheDirectory ||
    path.join(
      ensuredProjectRoot,
      '.expo',
      platform,
      'cache',
      mode || 'development',
      'babel-loader'
    );
  presetOptions.caller = {
    __dangerous_rule_id: 'expo-babel-loader',
    bundler: 'webpack',
    platform,
    mode,
  };
  return {
    test: /\.(mjs|[jt]sx?)$/,
    // Can only clobber test
    // Prevent clobbering the `include` and `use` values.
    ...options,
    include(inputPath: string): boolean {
      for (const possibleModule of modules) {
        if (inputPath.includes(path.normalize(possibleModule))) {
          if (verbose) {
            const packageName = packageNameFromPath(inputPath);
            if (packageName) logPackage(packageName);
          }
          return true;
        }
      }
      // Is inside the project and is not one of designated modules
      if (inputPath.includes(ensuredProjectRoot)) {
        for (const excluded of excludedRootPaths) {
          if (inputPath.includes(path.normalize(excluded))) {
            return false;
          }
        }
        return true;
      }
      return false;
    },
    use: {
      ...customUse,
      loader: require.resolve('babel-loader'),
      options: presetOptions,
    },
  };
}
