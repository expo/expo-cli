// Copyright 2021-present 650 Industries (Expo). All rights reserved.
import {
  createExpoMatcher,
  createKnownCommunityMatcher,
  createModuleMatcher,
  createReactNativeMatcher,
} from './createMatcher';
import { createMultiRuleTransformer, loaders } from './createMultiRuleTransformer';
import { getCacheKey } from './getCacheKey';

export function createExoticTransformer({
  nodeModulesPaths,
  transpileModules,
  expensiveTranspileModules,
}: {
  nodeModulesPaths: string[];
  expensiveTranspileModules?: string[];
  transpileModules: string[];
}) {
  // Match any node modules, or monorepo module.
  const nodeModuleMatcher = createModuleMatcher({ folders: nodeModulesPaths, moduleIds: [] });

  // Match node modules which are so oddly written that we must
  // transpile them with every possible option (most expensive).
  const impossibleNodeModuleMatcher = createModuleMatcher({
    moduleIds: [
      // victory is too wild
      // SyntaxError in ../../node_modules/victory-native/lib/components/victory-primitives/bar.js: Missing semicolon. (9:1)
      'victory',
      // vector icons has some hidden issues that break NCL
      '@expo/vector-icons',
      ...(expensiveTranspileModules || []),
    ],
    folders: nodeModulesPaths,
  });

  const transform = createMultiRuleTransformer({
    // Specify which rules to use on a per-file basis, basically
    // this is used to determine which modules are node modules, and which are application code.
    getRuleType({ filename }) {
      // Is a node module, and is not one of the impossible modules.
      return nodeModuleMatcher.test(filename) && !impossibleNodeModuleMatcher.test(filename)
        ? 'module'
        : 'app';
    },

    // Order is very important, we use wild card matchers to transpile
    // "every unhandled node module" and "every unhandled application module".
    rules: [
      // Match bob compiler modules, use the passthrough loader.
      {
        type: 'module',
        test: createModuleMatcher({ moduleIds: ['.*/lib/commonjs/'], folders: nodeModulesPaths }),
        transform: loaders.passthroughModule,
        warn: true,
      },
      // Match React Native modules, convert them statically using sucrase.
      {
        type: 'module',
        test: createReactNativeMatcher({ folders: nodeModulesPaths }),
        transform: loaders.reactNativeModule,
        warn: true,
      },
      // Match Expo SDK modules, convert them statically using sucrase.
      {
        type: 'module',
        test: createExpoMatcher({ folders: nodeModulesPaths }),
        transform: loaders.expoModule,
        warn: true,
      },
      // Match known problematic modules, convert them statically using an expensive, dynamic sucrase.
      {
        type: 'module',
        test: createKnownCommunityMatcher({
          folders: nodeModulesPaths,
          moduleIds: transpileModules,
        }),
        transform: loaders.untranspiledModule,
        warn: true,
      },
      // Pass through any unhandled node modules as passthrough, this is where the most savings occur.
      // Ideally, you want your project to pass all node modules through this loader.
      // This should be the last "module" rule.
      // Message library authors and ask them to ship their modules as pre-transpiled
      // commonjs, to improve the development speed of your project.
      {
        type: 'module',
        test: () => true,
        transform: loaders.passthroughModule,
      },
      // All application code should be transpiled with the user's babel preset,
      // this is the most expensive operation but provides the most customization to the user.
      // The goal is to use this as sparingly as possible.
      {
        test: () => true,
        transform: loaders.app,
      },
    ],
  });

  return {
    transform,
    getCacheKey,
  };
}
