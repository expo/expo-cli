import { getDefaultTarget } from '@expo/config';
import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs-extra';
import HashIds from 'hashids';
import path from 'path';
import readLastLines from 'read-last-lines';
import semver from 'semver';
import urljoin from 'url-join';
import { v1 as uuidv1, v4 as uuidv4 } from 'uuid';
import {
  EmbeddedAssets,
  Env,
  printBundleSizes,
  Project,
  ProjectAssets,
  UserManager,
  XDLError,
} from 'xdl';

import Log from '../../log';

export const ANONYMOUS_USERNAME = 'anonymous';

const bundlePlatforms: BundlePlatform[] = ['android', 'ios'];

type BundlePlatform = 'android' | 'ios';

type PlatformMetadata = { bundle: string; assets: { path: string; ext: string }[] };

type FileMetadata = {
  [key in BundlePlatform]: PlatformMetadata;
};

type Metadata = {
  version: 0;
  bundler: 'metro';
  fileMetadata: FileMetadata;
};

/**
 * If the `eas` flag is true, the stucture of the outputDir will be:
├── assets
│   └── *
├── bundles
│   ├── android-01ee6e3ab3e8c16a4d926c91808d5320.js
│   └── ios-ee8206cc754d3f7aa9123b7f909d94ea.js
└── metadata.json

 * If the `eas` flag is not true, then this function is for self hosting 
 * and the outputDir will have the files created in the project directory the following way:
.
├── android-index.json
├── ios-index.json
├── assets
│   └── 1eccbc4c41d49fd81840aef3eaabe862
└── bundles
      ├── android-01ee6e3ab3e8c16a4d926c91808d5320.js
      └── ios-ee8206cc754d3f7aa9123b7f909d94ea.js
 */
export async function exportAppAsync(
  projectRoot: string,
  publicUrl: string,
  assetUrl: string,
  outputDir: string,
  options: {
    isDev?: boolean;
    dumpAssetmap?: boolean;
    dumpSourcemap?: boolean;
    publishOptions?: Project.PublishOptions;
  } = {},
  experimentalBundle: boolean
): Promise<void> {
  const absoluteOutputDir = path.resolve(process.cwd(), outputDir);
  const defaultTarget = getDefaultTarget(projectRoot);
  const target = options.publishOptions?.target ?? defaultTarget;

  if (Log.isDebug) {
    Log.newLine();
    Log.log('Export Assets:');
    Log.log(`- Asset target: ${target}`);
    Log.newLine();
  }

  // build the bundles
  // make output dirs if not exists
  const assetPathToWrite = path.resolve(projectRoot, path.join(outputDir, 'assets'));
  await fs.ensureDir(assetPathToWrite);
  const bundlesPathToWrite = path.resolve(projectRoot, path.join(outputDir, 'bundles'));
  await fs.ensureDir(bundlesPathToWrite);

  const { exp, pkg, hooks } = await Project.getPublishExpConfigAsync(
    projectRoot,
    options.publishOptions || {}
  );

  const bundles = await Project.createBundlesAsync(projectRoot, options.publishOptions, {
    dev: options.isDev,
    useDevServer: Env.shouldUseDevServer(exp),
  });

  printBundleSizes(bundles);

  const iosBundle = bundles.ios.code;
  const androidBundle = bundles.android.code;

  const iosBundleHash = crypto.createHash('md5').update(iosBundle).digest('hex');
  const iosBundleUrl = `ios-${iosBundleHash}.js`;
  const iosJsPath = path.join(absoluteOutputDir, 'bundles', iosBundleUrl);

  const androidBundleHash = crypto.createHash('md5').update(androidBundle).digest('hex');
  const androidBundleUrl = `android-${androidBundleHash}.js`;
  const androidJsPath = path.join(absoluteOutputDir, 'bundles', androidBundleUrl);

  const relativeBundlePaths = {
    android: path.join('bundles', androidBundleUrl),
    ios: path.join('bundles', iosBundleUrl),
  };

  await Project.writeArtifactSafelyAsync(projectRoot, null, iosJsPath, iosBundle);
  await Project.writeArtifactSafelyAsync(projectRoot, null, androidJsPath, androidBundle);

  Log.log('Finished saving JS Bundles.');

  const { assets } = await ProjectAssets.exportAssetsAsync({
    projectRoot,
    exp,
    hostedUrl: publicUrl,
    assetPath: 'assets',
    outputDir: absoluteOutputDir,
    bundles,
    experimentalBundle,
  });

  if (experimentalBundle) {
    // Build metadata.json
    const fileMetadata: {
      [key in BundlePlatform]: Partial<PlatformMetadata>;
    } = { android: {}, ios: {} };
    bundlePlatforms.forEach(platform => {
      fileMetadata[platform].assets = [];
      bundles[platform].assets.forEach((asset: { type: string; fileHashes: string[] }) => {
        fileMetadata[platform].assets = [
          ...fileMetadata[platform].assets!,
          ...asset.fileHashes.map(hash => {
            return { path: path.join('assets', hash), ext: asset.type };
          }),
        ];
      });
      fileMetadata[platform].bundle = relativeBundlePaths[platform];
    });
    const metadata: Metadata = {
      version: 0,
      bundler: 'metro',
      fileMetadata: fileMetadata as FileMetadata,
    };

    fs.writeFileSync(path.resolve(outputDir, 'metadata.json'), JSON.stringify(metadata));
  }

  if (options.dumpAssetmap) {
    Log.log('Dumping asset map.');

    const assetmap: { [hash: string]: ProjectAssets.Asset } = {};

    assets.forEach((asset: ProjectAssets.Asset) => {
      assetmap[asset.hash] = asset;
    });

    await Project.writeArtifactSafelyAsync(
      projectRoot,
      null,
      path.join(absoluteOutputDir, 'assetmap.json'),
      JSON.stringify(assetmap)
    );
  }

  const iosSourceMap = bundles.ios.map;
  const androidSourceMap = bundles.android.map;

  // build source maps
  if (options.dumpSourcemap) {
    // write the sourcemap files
    const iosMapName = `ios-${iosBundleHash}.map`;
    const iosMapPath = path.join(absoluteOutputDir, 'bundles', iosMapName);
    await Project.writeArtifactSafelyAsync(projectRoot, null, iosMapPath, iosSourceMap);

    const androidMapName = `android-${androidBundleHash}.map`;
    const androidMapPath = path.join(absoluteOutputDir, 'bundles', androidMapName);
    await Project.writeArtifactSafelyAsync(projectRoot, null, androidMapPath, androidSourceMap);

    if (target === 'managed' && semver.lt(exp.sdkVersion, '40.0.0')) {
      // Remove original mapping to incorrect sourcemap paths
      // In SDK 40+ and bare projects, we no longer need to do this.
      Log.log('Configuring source maps');
      await truncateLastNLines(iosJsPath, 1);
      await truncateLastNLines(androidJsPath, 1);
    }

    // Add correct mapping to sourcemap paths
    await fs.appendFile(iosJsPath, `\n//# sourceMappingURL=${iosMapName}`);
    await fs.appendFile(androidJsPath, `\n//# sourceMappingURL=${androidMapName}`);

    // Make a debug html so user can debug their bundles
    Log.log('Preparing additional debugging files');
    const debugHtml = `
      <script src="${urljoin('bundles', iosBundleUrl)}"></script>
      <script src="${urljoin('bundles', androidBundleUrl)}"></script>
      Open up this file in Chrome. In the Javascript developer console, navigate to the Source tab.
      You can see a red coloured folder containing the original source code from your bundle.
      `;

    await Project.writeArtifactSafelyAsync(
      projectRoot,
      null,
      path.join(absoluteOutputDir, 'debug.html'),
      debugHtml
    );
  }

  // Skip the hooks and manifest creation if building for EAS.
  if (!experimentalBundle) {
    const validPostExportHooks = Project.prepareHooks(hooks, 'postExport', projectRoot);

    // Add assetUrl to manifest
    exp.assetUrlOverride = assetUrl;

    exp.publishedTime = new Date().toISOString();
    exp.commitTime = new Date().toISOString();
    exp.releaseId = uuidv4();

    // generate revisionId and id the same way www does
    const hashIds = new HashIds(uuidv1(), 10);
    exp.revisionId = hashIds.encode(Date.now());

    if (options.isDev) {
      exp.developer = {
        tool: 'exp',
      };
    }

    if (!exp.slug) {
      throw new XDLError('INVALID_MANIFEST', 'Must provide a slug field in the app.json manifest.');
    }

    let username = await UserManager.getCurrentUsernameAsync();

    if (!username) {
      username = ANONYMOUS_USERNAME;
    }

    exp.id = `@${username}/${exp.slug}`;

    // save the android manifest
    const androidManifest = {
      ...exp,
      bundleUrl: urljoin(publicUrl, 'bundles', androidBundleUrl),
      platform: 'android',
      dependencies: Object.keys(pkg.dependencies),
    };

    await Project.writeArtifactSafelyAsync(
      projectRoot,
      null,
      path.join(absoluteOutputDir, 'android-index.json'),
      JSON.stringify(androidManifest)
    );

    // save the ios manifest
    const iosManifest = {
      ...exp,
      bundleUrl: urljoin(publicUrl, 'bundles', iosBundleUrl),
      platform: 'ios',
      dependencies: Object.keys(pkg.dependencies),
    };

    await Project.writeArtifactSafelyAsync(
      projectRoot,
      null,
      path.join(absoluteOutputDir, 'ios-index.json'),
      JSON.stringify(iosManifest)
    );

    assert(androidManifest!, 'should have been assigned');
    assert(iosManifest!, 'should have been assigned');
    const hookOptions = {
      url: null,
      exp,
      iosBundle,
      iosSourceMap,
      iosManifest,
      androidBundle,
      androidSourceMap,
      androidManifest,
      projectRoot,
      log: (msg: any) => {
        Log.info(msg);
        // logger.global.info({ quiet: true }, msg);
      },
    };

    for (const hook of validPostExportHooks) {
      Log.log(`Running postExport hook: ${hook.file}`);

      try {
        Project.runHook(hook, hookOptions);
      } catch (e) {
        Log.warn(`Warning: postExport hook '${hook.file}' failed: ${e.stack}`);
      }
    }

    // configure embedded assets for expo-updates or ExpoKit
    await EmbeddedAssets.configureAsync({
      projectRoot,
      pkg,
      exp,
      iosManifestUrl: urljoin(publicUrl, 'ios-index.json'),
      iosManifest,
      iosBundle,
      iosSourceMap,
      androidManifestUrl: urljoin(publicUrl, 'android-index.json'),
      androidManifest,
      androidBundle,
      androidSourceMap,
      target,
    });
  }
}

// truncate the last n lines in a file
async function truncateLastNLines(filePath: string, n: number) {
  const lines = await readLastLines.read(filePath, n);
  const to_vanquish = lines.length;
  const { size } = await fs.stat(filePath);
  await fs.truncate(filePath, size - to_vanquish);
}
