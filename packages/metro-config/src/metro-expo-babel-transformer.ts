import crypto from 'crypto';
import { readFileSync } from 'fs';

import { resolveSilent } from './resolve';

const cacheKeyParts = [
  readFileSync(__filename),
  // Since babel-preset-fbjs cannot be safely resolved relative to the
  // project root, use this environment variable that we define earlier.
  process.env.EXPO_METRO_CACHE_KEY_VERSION || '3.3.0',
  //   require('babel-preset-fbjs/package.json').version,
];

let transformer: any = null;

function resolveTransformer(projectRoot: string) {
  if (transformer) {
    return transformer;
  }
  const resolvedPath = resolveSilent(projectRoot, 'metro-react-native-babel-transformer');
  if (!resolvedPath) {
    throw new Error(
      'Missing package "metro-react-native-babel-transformer" in the project. ' +
        'This usually means `react-native` is not installed. ' +
        'Please verify that dependencies in package.json include "react-native" ' +
        'and run `yarn` or `npm install`.'
    );
  }
  transformer = require(resolvedPath);
  return transformer;
}

/**
 * Extends the default `metro-react-native-babel-transformer`
 * and uses babel-preset-expo as the default instead of metro-react-native-babel-preset.
 * This enables users to safely transpile an Expo project without
 * needing to explicitly define a `babel.config.js`
 *
 * @param filename string
 * @param options BabelTransformerOptions
 * @param plugins $PropertyType<BabelCoreOptions, 'plugins'>
 * @param src string
 *
 * @returns
 */
function transform(props: {
  filename: string;
  options: Record<string, any> & { projectRoot: string };
  plugins?: unknown;
  src: string;
}) {
  // Use babel-preset-expo by default if available...
  props.options.extendsBabelConfigPath = resolveSilent(
    props.options.projectRoot,
    'babel-preset-expo'
  );
  return resolveTransformer(props.options.projectRoot).transform(props);
}

// Matches upstream
function getCacheKey(): string {
  const key = crypto.createHash('md5');
  cacheKeyParts.forEach(part => key.update(part));
  return key.digest('hex');
}

module.exports = {
  getCacheKey,
  transform,
};
