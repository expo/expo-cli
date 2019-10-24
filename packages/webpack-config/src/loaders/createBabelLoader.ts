import path from 'path';
import chalk from 'chalk';
import { Rule } from 'webpack';
import fs from 'fs-extra';
import { getPossibleProjectRoot } from '../utils/paths';
import { Mode } from '../types';
import { loadPartialConfig } from '@babel/core';

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
];

const excludedRootPaths = [
  'node_modules',
  'bower_components',
  '.expo',
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
 * A complex babel loader which uses the project's `babel.config.js`
 * to resolve all of the Unimodules which are shipped as ES modules (early 2019).
 */
export default function createBabelLoader({
  /**
   * The webpack mode: `"production" | "development"`
   */
  mode,
  babelProjectRoot,
  include = [],
  verbose,
  platform,
  useCustom,
  ...options
}: {
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

  const projectRoot = getPossibleProjectRoot();
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
    presetOptions = {
      babelrc: false,
      configFile: false,
      presets: [require.resolve('babel-preset-expo')],
    };
  }

  const cacheIdentifier = generateCacheIdentifier(ensuredProjectRoot);
  return {
    test: /\.(mjs|[jt]sx?)$/,
    // Can only clobber test
    // Prevent clobbering the `include` and `use` values.
    ...options,
    include(inputPath: string): boolean {
      if (!useCustom && !isProduction && /node_modules[\\/]react-native-web/.test(inputPath)) {
        return false;
      }

      for (const possibleModule of modules) {
        if (inputPath.includes(possibleModule)) {
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
          if (inputPath.includes(excluded)) {
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
      options: {
        ...presetOptions,

        cacheCompression: !isProduction,
        cacheDirectory: path.join(
          ensuredProjectRoot,
          '.expo',
          'web',
          'cache',
          mode || 'development',
          'babel-loader'
        ),
        cacheIdentifier,

        // Only clobber hard coded values.
        ...(customUseOptions || {}),

        caller: {
          bundler: 'webpack',
          platform,
          mode,
        },
        sourceType: 'unambiguous',
        root: ensuredProjectRoot,
        compact: isProduction,
      },
    },
  };
}
