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
import * as Utils from '../Utils';
import * as Versions from '../Versions';

async function _getVersionedExpoKitConfigAsync(sdkVersion) {
  const versions = await Versions.versionsAsync();
  let sdkVersionConfig = versions.sdkVersions[sdkVersion];
  const { iosVersion, iosExpoViewUrl } = sdkVersionConfig;
  const iosClientVersion = iosVersion ? iosVersion : versions.iosVersion;
  return {
    iosClientVersion,
    iosExpoViewUrl,
  };
}

async function _getOrCreateTemplateDirectoryAsync(projectRoot, iosExpoViewUrl) {
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
  projectDirectory,
  projectName,
  manifest
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

  const bundleIdentifier =
    manifest.ios && manifest.ios.bundleIdentifier
      ? manifest.ios.bundleIdentifier
      : '';

  await Promise.all(
    filesToTransform.map(async fileName => {
      return transformFileContentsAsync(
        path.join(projectDirectory, fileName),
        fileString => {
          return fileString
            .replace(
              /com.getexponent.exponent-view-template/g,
              bundleIdentifier
            )
            .replace(/exponent-view-template/g, projectName);
        }
      );
    })
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
    let destFileName = path.join(
      path.dirname(fileName),
      `${projectName}${path.extname(fileName)}`
    );
    await spawnAsync('/bin/mv', [
      path.join(projectDirectory, fileName),
      path.join(projectDirectory, destFileName),
    ]);
  });

  return;
}

async function _renderPodfileFromTemplateAsync(
  projectRoot,
  manifest,
  templatePodfilePath,
  sdkVersion,
  iosClientVersion
) {
  const { iosProjectDirectory, projectName } = getPaths(projectRoot, manifest);
  let podfileSubstitutions = {
    TARGET_NAME: projectName,
    REACT_NATIVE_PATH: path.relative(
      iosProjectDirectory,
      path.join(projectRoot, 'node_modules', 'react-native')
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

async function createDetachedAsync(projectRoot, manifest, sdkVersion) {
  const { iosProjectDirectory, projectName } = getPaths(projectRoot, manifest);
  const {
    iosClientVersion,
    iosExpoViewUrl,
  } = await _getVersionedExpoKitConfigAsync(sdkVersion);

  const expoTemplateDirectory = await _getOrCreateTemplateDirectoryAsync(
    projectRoot,
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
  await _renameAndMoveProjectFilesAsync(
    iosProjectDirectory,
    projectName,
    manifest
  );

  console.log('Configuring iOS dependencies...');
  const templatePodfilePath = path.join(
    expoTemplateDirectory,
    'template-files',
    'ios',
    'ExpoKit-Podfile'
  );
  await _renderPodfileFromTemplateAsync(
    projectRoot,
    manifest,
    templatePodfilePath,
    sdkVersion,
    iosClientVersion
  );

  if (!process.env.EXPO_VIEW_DIR) {
    rimrafDontThrow(expoTemplateDirectory);
  }

  return;
}

function getPaths(projectRoot, manifest) {
  let iosProjectDirectory = path.join(projectRoot, 'ios');
  let projectName;
  let supportingDirectory;
  if (manifest && manifest.name) {
    let projectNameLabel = manifest.name;
    projectName = projectNameLabel.replace(/[^a-z0-9_\-]/gi, '-').toLowerCase();
    supportingDirectory = path.join(
      iosProjectDirectory,
      projectName,
      'Supporting'
    );
  } else {
    throw new Error(
      'Cannot configure an ExpoKit app with no name. Are you missing `exp.json`?'
    );
  }
  return {
    iosProjectDirectory,
    projectName,
    supportingDirectory,
  };
}

export { createDetachedAsync, getPaths };
