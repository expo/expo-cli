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

async function _getOrCreateTemplateDirectoryAsync(
  context: StandaloneContext,
  iosExpoViewUrl: string
) {
  if (context.type === 'service') {
    return path.join(context.data.expoSourcePath, '..');
  } else if (context.type === 'user') {
    let expoRootTemplateDirectory;
    if (process.env.EXPO_VIEW_DIR) {
      // Only for testing
      expoRootTemplateDirectory = process.env.EXPO_VIEW_DIR;
    } else {
      // HEY: if you need other paths into the extracted archive, be sure and include them
      // when the archive is generated in `ios/pipeline.js`
      expoRootTemplateDirectory = path.join(context.data.projectPath, 'temp-ios-directory');
      if (!isDirectory(expoRootTemplateDirectory)) {
        mkdirp.sync(expoRootTemplateDirectory);
        console.log('Downloading iOS code...');
        await Api.downloadAsync(iosExpoViewUrl, expoRootTemplateDirectory, {
          extract: true,
        });
      }
    }
    return expoRootTemplateDirectory;
  }
}

async function _renameAndMoveProjectFilesAsync(
  context: StandaloneContext,
  projectDirectory: string,
  projectName: string
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

  let bundleIdentifier;
  if (context.type === 'user') {
    const exp = context.data.exp;
    bundleIdentifier = exp.ios && exp.ios.bundleIdentifier ? exp.ios.bundleIdentifier : null;
    if (!bundleIdentifier) {
      throw new Error(`Cannot configure an ExpoKit workspace with no iOS bundle identifier.`);
    }
  } else if (context.type === 'service') {
    bundleIdentifier = 'host.exp.Exponent';
  }

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
async function _configureVersionsPlistAsync(
  configFilePath: string,
  standaloneSdkVersion: string,
  isMultipleVersion: boolean
) {
  await IosPlist.modifyAsync(configFilePath, 'EXSDKVersions', versionConfig => {
    if (isMultipleVersion) {
      delete versionConfig.detachedNativeVersions;
      // leave versionConfig.sdkVersions unchanged
      // because the ExpoKit template already contains the list of supported versions.
    } else {
      versionConfig.sdkVersions = [standaloneSdkVersion];
      versionConfig.detachedNativeVersions = {
        shell: standaloneSdkVersion,
        kernel: standaloneSdkVersion,
      };
    }
    return versionConfig;
  });
}

// TODO: logic for builds that support multiple RN versions.
async function _renderPodfileFromTemplateAsync(
  context: StandaloneContext,
  expoRootTemplateDirectory: string,
  sdkVersion: string,
  iosClientVersion: string
) {
  const { iosProjectDirectory, projectName } = getPaths(context);
  const templatePodfilePath = path.join(
    expoRootTemplateDirectory,
    'template-files',
    'ios',
    'ExpoKit-Podfile'
  );
  let reactNativeDependencyPath;
  if (context.type === 'user') {
    reactNativeDependencyPath = path.relative(
      iosProjectDirectory,
      path.join(context.data.projectPath, 'node_modules', 'react-native')
    );
  } else if (context.type === 'service') {
    reactNativeDependencyPath = path.join(
      expoRootTemplateDirectory,
      '..',
      'react-native-lab',
      'react-native'
    );
  } else {
    throw new Error(`Unsupported context type: ${context.type}`);
  }
  let podfileSubstitutions = {
    TARGET_NAME: projectName,
    REACT_NATIVE_PATH: reactNativeDependencyPath,
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
  let isMultipleVersion, standaloneSdkVersion;
  if (context.type === 'user') {
    standaloneSdkVersion = context.config.sdkVersion;
    isMultipleVersion = false;
  } else if (context.type === 'service') {
    const { version } = await Versions.newestSdkVersionAsync();
    standaloneSdkVersion = version;
    isMultipleVersion = true;
  }
  const { iosProjectDirectory, projectName, supportingDirectory } = getPaths(context);
  console.log(`Creating ExpoKit workspace at ${iosProjectDirectory}...`);

  const { iosClientVersion, iosExpoViewUrl } = await _getVersionedExpoKitConfigAsync(
    standaloneSdkVersion
  );
  const expoRootTemplateDirectory = await _getOrCreateTemplateDirectoryAsync(
    context,
    iosExpoViewUrl
  );

  // copy template workspace
  console.log('Moving iOS project files...');
  await Utils.ncpAsync(
    path.join(expoRootTemplateDirectory, 'exponent-view-template', 'ios'),
    iosProjectDirectory
  );

  console.log('Naming iOS project...');
  await _renameAndMoveProjectFilesAsync(context, iosProjectDirectory, projectName);

  console.log('Configuring iOS dependencies...');
  // this configuration must happen prior to build time because it affects which
  // native versions of RN we depend on.
  await _configureVersionsPlistAsync(supportingDirectory, standaloneSdkVersion, isMultipleVersion);
  // TODO: add multiple versions in service context
  await _renderPodfileFromTemplateAsync(
    context,
    expoRootTemplateDirectory,
    standaloneSdkVersion,
    iosClientVersion
  );

  if (!process.env.EXPO_VIEW_DIR) {
    if (context.type === 'user') {
      rimrafDontThrow(expoRootTemplateDirectory);
    }
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

/**
 *  paths returned:
 *    iosProjectDirectory - root directory of an (uncompiled) xcworkspace and obj-c source tree
 *    projectName - xcworkspace project name normalized from context.config
 *    supportingDirectory - location of Info.plist, xib files, etc. during configuration.
 *      for an unbuilt app this is underneath iosProjectDirectory. for a compiled app it's just
 *      a path to the flat xcarchive.
 *    intermediatesDirectory - temporary spot to write whatever files are needed during the
 *      detach/build process but can be discarded afterward.
 */
function getPaths(context: StandaloneContext) {
  let iosProjectDirectory;
  let projectName;
  let supportingDirectory;
  let intermediatesDirectory;
  if (context.isAnonymous()) {
    projectName = 'ExpoProject';
  } else if (context.config && context.config.name) {
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
    iosProjectDirectory = context.build.ios.workspaceSourcePath;
    intermediatesDirectory = path.join(iosProjectDirectory, '..', 'intermediates');
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
