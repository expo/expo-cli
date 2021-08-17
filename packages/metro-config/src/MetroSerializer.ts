/**
 * Copyright (c) 2021 Expo, Inc.
 * Copyright (c) 2021 Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Based on https://github.com/microsoft/rnx-kit/blob/19c1d9c9385c7dc20eb9f54d1749a968f2504176/packages/metro-serializer/src/index.ts
 * Added support for importing metro files from the project rather than the global CLI.
 */

import type { Graph, MixedOutput, Module, SerializerOptions } from 'metro';
import resolveFrom from 'resolve-from';
import * as semver from 'semver';

export type MetroPlugin<T = MixedOutput> = (
  entryPoint: string,
  preModules: readonly Module<T>[],
  graph: Graph<T>,
  options: SerializerOptions<T>
) => void;

export type CustomSerializerResult = string | { code: string; map: string };

export type CustomSerializer = (
  entryPoint: string,
  preModules: readonly Module[],
  graph: Graph,
  options: SerializerOptions
) => Promise<CustomSerializerResult> | CustomSerializerResult;

/**
 * Metro's default bundle serializer.
 *
 * Note that the return type changed to a `Promise` in
 * [0.60](https://github.com/facebook/metro/commit/d6b9685c730d0d63577db40f41369157f28dfa3a).
 *
 * @see https://github.com/facebook/metro/blob/af23a1b27bcaaff2e43cb795744b003e145e78dd/packages/metro/src/Server.js#L228
 */
export function MetroSerializer(projectRoot: string, plugins: MetroPlugin[]): CustomSerializer {
  const baseJSBundle = require(resolveFrom(
    projectRoot,
    'metro/src/DeltaBundler/Serializers/baseJSBundle'
  ));
  const bundleToString = require(resolveFrom(projectRoot, 'metro/src/lib/bundleToString'));

  const { version } = require(resolveFrom(projectRoot, 'metro/package.json'));
  const shouldReturnPromise = semver.satisfies(version, '>=0.60.0');

  return (
    entryPoint: string,
    preModules: readonly Module[],
    graph: Graph,
    options: SerializerOptions
  ): string | Promise<string> => {
    plugins.forEach(plugin => plugin(entryPoint, preModules, graph, options));
    const bundle = baseJSBundle(entryPoint, preModules, graph, options);
    const bundleCode = bundleToString(bundle).code;
    return shouldReturnPromise ? Promise.resolve(bundleCode) : bundleCode;
  };
}
