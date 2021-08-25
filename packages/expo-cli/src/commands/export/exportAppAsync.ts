import { ExpoAppManifest, getDefaultTarget, HookArguments } from '@expo/config';
import fs from 'fs-extra';
import HashIds from 'hashids';
import path from 'path';
import semver from 'semver';
import { v1 as uuidv1, v4 as uuidv4 } from 'uuid';
import { EmbeddedAssets, Env, printBundleSizes, Project, ProjectAssets, UserManager } from 'xdl';

import Log from '../../log';
import { BundlePlatform } from './createMetadataJson';
import {
  createMultiPlatformBundleInfo,
  MultiPlatformBundleInfo,
  writeAssetMapAsync,
  writeBundlesAsync,
  writeDebugHtmlAsync,
  writeMetadataJsonAsync,
  writePlatformManifestsAsync,
  writeSourceMapsAsync,
} from './writeContents';

export const ANONYMOUS_USERNAME = 'anonymous';

/**
 * If the `experimentalBundle` flag is true, the structure of the outputDir will be:
 *
 * ```
 * ├── assets
 * │   └── *
 * ├── bundles
 * │   ├── android-01ee6e3ab3e8c16a4d926c91808d5320.js
 * │   └── ios-ee8206cc754d3f7aa9123b7f909d94ea.js
 * └── metadata.json
 * ```
 *
 * If the `experimentalBundle` flag is not true, then this function is for self hosting
 * and the outputDir will have the files created in the project directory the following way:
 *
 * ```
 * ├── android-index.json
 * ├── ios-index.json
 * ├── assets
 * │   └── 1eccbc4c41d49fd81840aef3eaabe862
 * └── bundles
 *       ├── android-01ee6e3ab3e8c16a4d926c91808d5320.js
 *       └── ios-ee8206cc754d3f7aa9123b7f909d94ea.js
 * ```
 */
export async function exportAppAsync(
  projectRoot: string,
  publicUrl: string,
  assetUrl: string,
  outputDir: string,
  options: {
    platforms: BundlePlatform[];
    isDev?: boolean;
    dumpAssetmap?: boolean;
    dumpSourcemap?: boolean;
    publishOptions?: Project.PublishOptions;
  },
  experimentalBundle: boolean
): Promise<void> {
  const { exp, pkg, hooks } = await Project.getPublishExpConfigAsync(
    projectRoot,
    options.publishOptions || {}
  );

  const absoluteOutputDir = path.resolve(projectRoot, outputDir);
  const defaultTarget = getDefaultTarget(projectRoot, exp);
  const target = options.publishOptions?.target ?? defaultTarget;

  const assetPathToWrite = path.resolve(absoluteOutputDir, 'assets');
  const bundlesPathToWrite = path.resolve(absoluteOutputDir, 'bundles');

  await Promise.all([fs.ensureDir(assetPathToWrite), fs.ensureDir(bundlesPathToWrite)]);

  if (Log.isDebug) {
    Log.newLine();
    Log.log('Export Assets:');
    Log.log(`- Asset target: ${target}`);
    Log.newLine();
  }

  // Run metro bundler and create the JS bundles/source maps.
  const bundles = await Project.createBundlesAsync(projectRoot, options.publishOptions, {
    platforms: options.platforms,
    dev: options.isDev,
    useDevServer: Env.shouldUseDevServer(exp),
    // TODO: Disable source map generation if we aren't outputting them.
  });

  // Log bundle size info to the user
  printBundleSizes(bundles);

  // Write the JS bundles to disk, and get the bundle file names (this could change with async chunk loading support).
  const { hashes, fileNames } = await writeBundlesAsync({ bundles, outputDir: bundlesPathToWrite });

  Log.log('Finished saving JS Bundles');

  const { assets } = await ProjectAssets.exportAssetsAsync({
    projectRoot,
    exp,
    hostedUrl: publicUrl,
    assetPath: 'assets',
    outputDir: absoluteOutputDir,
    bundles,
    experimentalBundle,
  });

  if (options.dumpAssetmap) {
    Log.log('Dumping asset map');
    await writeAssetMapAsync({ outputDir: absoluteOutputDir, assets });
  }

  // build source maps
  if (options.dumpSourcemap) {
    // TODO: Maybe move this into the bundler settings.
    const removeOriginalSourceMappingUrl =
      target === 'managed' && semver.lt(exp.sdkVersion, '40.0.0');

    await writeSourceMapsAsync({
      bundles,
      hashes,
      outputDir: bundlesPathToWrite,
      fileNames,
      removeOriginalSourceMappingUrl,
    });
    // If we output source maps, then add a debug HTML file which the user can open in
    // the web browser to inspect the output like web.
    await writeDebugHtmlAsync({
      outputDir: absoluteOutputDir,
      fileNames,
    });
  }

  // Skip the hooks and manifest creation if building for EAS.
  if (experimentalBundle) {
    // Generate a metadata.json and bail.
    await writeMetadataJsonAsync({ outputDir, bundles, fileNames });
    return;
  }

  // Load the "post export" hooks
  const validPostExportHooks = Project.prepareHooks(hooks, 'postExport', projectRoot);

  // Append server values to the Expo config.
  mutateExpoConfigWithManifestValues(exp, {
    assetUrl,
    isDev: options.isDev,
    username: await UserManager.getCurrentUsernameAsync(),
  });

  // TODO: Add a comment explaining what platform manifests are used for
  const manifests = await writePlatformManifestsAsync({
    outputDir: absoluteOutputDir,
    publicUrl,
    fileNames,
    exp,
    pkg,
  });

  // Create the shared bundle info object in somewhat of a legacy format.
  const bundleInfo = createMultiPlatformBundleInfo({ bundles, manifests, publicUrl });

  // Run post export hooks for users who want to do things like uploading source maps to sentry.
  runHooks({ projectRoot, exp, hooks: validPostExportHooks, info: bundleInfo });

  // configure embedded assets for expo-updates or ExpoKit
  await EmbeddedAssets.configureAsync({
    ...bundleInfo,
    projectRoot,
    exp,
    pkg,
    target,
  });
}

function runHooks({
  projectRoot,
  exp,
  hooks,
  info,
}: {
  projectRoot: string;
  exp: ExpoAppManifest;
  info: MultiPlatformBundleInfo;
  hooks: Project.LoadedHook[];
}) {
  const hookOptions: Omit<HookArguments, 'config'> = {
    url: null,
    ...info,
    projectRoot,
    exp,
    log: Log.info,
  };

  for (const hook of hooks) {
    Log.log(`Running postExport hook: ${hook.file}`);
    try {
      Project.runHook(hook, hookOptions);
    } catch (e) {
      Log.warn(`Warning: postExport hook '${hook.file}' failed: ${e.stack}`);
    }
  }
}

// TODO: Move to expo/config for public manifests
function mutateExpoConfigWithManifestValues(
  exp: ExpoAppManifest,
  { assetUrl, isDev, username }: { assetUrl: string; isDev?: boolean; username?: string | null }
) {
  // Add assetUrl to manifest
  exp.assetUrlOverride = assetUrl;

  exp.publishedTime = new Date().toISOString();
  exp.commitTime = new Date().toISOString();
  exp.releaseId = uuidv4();

  // generate revisionId and id the same way www does
  const hashIds = new HashIds(uuidv1(), 10);
  exp.revisionId = hashIds.encode(Date.now());

  if (isDev) {
    exp.developer = {
      tool: 'exp',
    };
  }

  if (!username) {
    username = ANONYMOUS_USERNAME;
  }

  exp.id = `@${username}/${exp.slug}`;

  return exp;
}
