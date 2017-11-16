/**
 * @flow
 */
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import rimraf from 'rimraf';

import Api from '../Api';
import {
  isDirectory,
  rimrafDontThrow,
  spawnAsync,
  transformFileContentsAsync,
} from './ExponentTools';
import { renderPodfileAsync } from './IosPodsTools.js';
import * as IosPlist from './IosPlist';
import * as Utils from '../Utils';
import StandaloneContext from './StandaloneContext';
import * as Versions from '../Versions';

async function _getVersionedExpoKitConfigAsync(sdkVersion: string): any {
  const versions = await Versions.versionsAsync();
  let sdkVersionConfig = versions.sdkVersions[sdkVersion];
  if (!sdkVersionConfig) {
    if (process.env.EXPO_VIEW_DIR) {
      sdkVersionConfig = {};
    } else {
      throw new Error(`Unsupported SDK version: ${sdkVersion}`);
    }
  }
  const { iosVersion, iosExpoViewUrl } = sdkVersionConfig;
  const iosClientVersion = iosVersion ? iosVersion : versions.iosVersion;
  return {
    iosClientVersion,
    iosExpoViewUrl,
  };
}

async function _getOrCreateTemplateDirectoryAsync(projectRoot: string, iosExpoViewUrl: string) {
  let expoTemplateDirectory;
  if (process.env.EXPO_VIEW_DIR) {
    // Only for testing
    expoTemplateDirectory = process.env.EXPO_VIEW_DIR;
  } else {
    expoTemplateDirectory = path.join(projectRoot, 'temp-ios-directory');
    if (!isDirectory(expoTemplateDirectory)) {
      mkdirp.sync(expoTemplateDirectory);
      console.log('Downloading iOS code...');
      await Api.downloadAsync(iosExpoViewUrl, expoTemplateDirectory, {
        extract: true,
      });
    }
  }
  return expoTemplateDirectory;
}

async function _renameAndMoveProjectFilesAsync(
  projectDirectory: string,
  projectName: string,
  exp: any
) {
  // remove .gitignore, as this actually pertains to internal expo template management
  try {
    const gitIgnorePath = path.join(projectDirectory, '.gitignore');
    if (fs.existsSync(gitIgnorePath)) {
      rimraf.sync(gitIgnorePath);
    }
  } catch (e) {}

  const filesToTransform = [
    path.join('exponent-view-template.xcodeproj', 'project.pbxproj'),
    path.join('exponent-view-template.xcworkspace', 'contents.xcworkspacedata'),
    path.join(
      'exponent-view-template.xcodeproj',
      'xcshareddata',
      'xcschemes',
      'exponent-view-template.xcscheme'
    ),
  ];

  const bundleIdentifier = exp.ios && exp.ios.bundleIdentifier ? exp.ios.bundleIdentifier : '';

  await Promise.all(
    filesToTransform.map(fileName =>
      transformFileContentsAsync(path.join(projectDirectory, fileName), fileString => {
        return fileString
          .replace(/com.getexponent.exponent-view-template/g, bundleIdentifier)
          .replace(/exponent-view-template/g, projectName);
      })
    )
  );

  // order of this array matters
  const filesToMove = [
    'exponent-view-template',
    path.join(
      'exponent-view-template.xcodeproj',
      'xcshareddata',
      'xcschemes',
      'exponent-view-template.xcscheme'
    ),
    'exponent-view-template.xcodeproj',
    'exponent-view-template.xcworkspace',
  ];

  filesToMove.forEach(async fileName => {
    let destFileName = path.join(path.dirname(fileName), `${projectName}${path.extname(fileName)}`);
    await spawnAsync('/bin/mv', [
      path.join(projectDirectory, fileName),
      path.join(projectDirectory, destFileName),
    ]);
  });

  return;
}

// TODO: logic for when kernel sdk version is different from detached sdk version
// TODO: logic for when we're building a shell app (which may support many versions).
async function _configureVersionsPlistAsync(
  configFilePath: string,
  detachedSDKVersion: string,
  kernelSDKVersion: string
) {
  await IosPlist.modifyAsync(configFilePath, 'EXSDKVersions', versionConfig => {
    versionConfig.sdkVersions = [detachedSDKVersion];
    versionConfig.detachedNativeVersions = {
      shell: detachedSDKVersion,
      kernel: kernelSDKVersion,
    };
    return versionConfig;
  });
}

// TODO: logic for builds that support multiple RN versions.
async function _renderPodfileFromTemplateAsync(
  context: StandaloneContext,
  templatePodfilePath: string,
  sdkVersion: string,
  iosClientVersion: string
) {
  const { iosProjectDirectory, projectName } = getPaths(context);
  let podfileSubstitutions = {
    TARGET_NAME: projectName,
    REACT_NATIVE_PATH: path.relative(
      iosProjectDirectory,
      path.join(context.data.projectPath, 'node_modules', 'react-native')
    ),
    EXPOKIT_TAG: `ios/${iosClientVersion}`,
  };
  if (process.env.EXPOKIT_TAG_IOS) {
    console.log(`EXPOKIT_TAG_IOS: Using custom ExpoKit iOS tag...`);
    podfileSubstitutions.EXPOKIT_TAG = process.env.EXPOKIT_TAG_IOS;
  } else if (process.env.EXPO_VIEW_DIR) {
    console.log('EXPO_VIEW_DIR: Using local ExpoKit source for iOS...');
    podfileSubstitutions.EXPOKIT_PATH = path.relative(
      iosProjectDirectory,
      process.env.EXPO_VIEW_DIR
    );
  }
  await renderPodfileAsync(
    templatePodfilePath,
    path.join(iosProjectDirectory, 'Podfile'),
    podfileSubstitutions,
    sdkVersion
  );
}

async function createDetachedAsync(context: StandaloneContext) {
  // TODO: support both types of context
  if (context.type !== 'user') {
    throw new Error(`IosWorkspace only supports user standalone contexts`);
  }
  const sdkVersion = context.config.sdkVersion;
  const { iosProjectDirectory, projectName, supportingDirectory } = getPaths(context);
  const { iosClientVersion, iosExpoViewUrl } = await _getVersionedExpoKitConfigAsync(sdkVersion);

  const expoTemplateDirectory = await _getOrCreateTemplateDirectoryAsync(
    context.data.projectPath,
    iosExpoViewUrl
  );

  // copy downloaded template xcodeproj into the user's project.
  // HEY: if you need other paths into the extracted archive, be sure and include them
  // when the archive is generated in `ios/pipeline.js`
  console.log('Moving iOS project files...');
  await Utils.ncpAsync(
    path.join(expoTemplateDirectory, 'exponent-view-template', 'ios'),
    iosProjectDirectory
  );

  console.log('Naming iOS project...');
  await _renameAndMoveProjectFilesAsync(iosProjectDirectory, projectName, context.data.exp);

  console.log('Configuring iOS dependencies...');
  // this configuration must happen prior to build time because it affects which
  // native versions of RN we depend on.
  await _configureVersionsPlistAsync(supportingDirectory, sdkVersion, sdkVersion);
  const templatePodfilePath = path.join(
    expoTemplateDirectory,
    'template-files',
    'ios',
    'ExpoKit-Podfile'
  );
  await _renderPodfileFromTemplateAsync(context, templatePodfilePath, sdkVersion, iosClientVersion);

  if (!process.env.EXPO_VIEW_DIR) {
    rimrafDontThrow(expoTemplateDirectory);
    await IosPlist.cleanBackupAsync(supportingDirectory, 'EXSDKVersions', false);
  }

  return;
}

function addDetachedConfigToExp(exp: any, context: StandaloneContext): any {
  if (context.type !== 'user') {
    console.warn(`Tried to modify exp for a non-user StandaloneContext, ignoring`);
    return;
  }
  if (!exp) {
    exp = {};
  }
  const { supportingDirectory } = getPaths(context);
  exp.ios.publishBundlePath = path.relative(
    context.data.projectPath,
    path.join(supportingDirectory, 'shell-app.bundle')
  );
  exp.ios.publishManifestPath = path.relative(
    context.data.projectPath,
    path.join(supportingDirectory, 'shell-app-manifest.json')
  );
  return exp;
}

function getPaths(context: StandaloneContext) {
  let iosProjectDirectory;
  let projectName;
  let supportingDirectory;
  let intermediatesDirectory;
  if (context.config && context.config.name) {
    let projectNameLabel = context.config.name;
    projectName = projectNameLabel.replace(/[^a-z0-9_\-]/gi, '-').toLowerCase();
  } else {
    throw new Error('Cannot configure an Expo project with no name.');
  }
  if (context.type === 'user') {
    iosProjectDirectory = path.join(context.data.projectPath, 'ios');
    supportingDirectory = path.join(iosProjectDirectory, projectName, 'Supporting');
    intermediatesDirectory = path.join(iosProjectDirectory, 'ExpoKitIntermediates');
  } else if (context.type === 'service') {
    // compiled archive has a flat NSBundle
    supportingDirectory = context.data.archivePath;
    iosProjectDirectory = context.data.archivePath;
    intermediatesDirectory = path.join(context.data.expoSourcePath, '..', 'shellAppIntermediates');
  } else {
    throw new Error(`Unsupported StandaloneContext type: ${context.type}`);
  }
  return {
    intermediatesDirectory,
    iosProjectDirectory,
    projectName,
    supportingDirectory,
  };
}

export { addDetachedConfigToExp, createDetachedAsync, getPaths };
