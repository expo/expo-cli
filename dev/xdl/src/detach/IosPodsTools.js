// Copyright 2015-present 650 Industries. All rights reserved.

'use strict';

import fs from 'fs-extra';
import glob from 'glob-promise';
import indentString from 'indent-string';
import JsonFile from '@expo/json-file';
import path from 'path';

import { parseSdkMajorVersion } from './ExponentTools';

function _validatePodfileSubstitutions(substitutions) {
  const validKeys = [
    // a pod dependency on ExpoKit (can be local or remote)
    'EXPOKIT_DEPENDENCY',
    // local path to ExpoKit dependency
    'EXPOKIT_PATH',
    // tag to use for ExpoKit dependency
    'EXPOKIT_TAG',
    // the contents of dependencies.json enumerated as deps in podfile format
    'EXPONENT_CLIENT_DEPS',
    // postinstall for detached projects (defines EX_DETACHED among other things)
    'PODFILE_DETACHED_POSTINSTALL',
    // same as previous but also defines EX_DETACHED_SERVICE
    'PODFILE_DETACHED_SERVICE_POSTINSTALL',
    // ExponentIntegrationTests
    'PODFILE_TEST_TARGET',
    // unversioned react native pod dependency, probably at the path given in
    // REACT_NATIVE_PATH, with a bunch of subspecs.
    'PODFILE_UNVERSIONED_RN_DEPENDENCY',
    // postinstall hook for unversioned deps
    'PODFILE_UNVERSIONED_POSTINSTALL',
    // versioned rn dependencies (paths to versioned-react-native directories)
    // read from template files
    'PODFILE_VERSIONED_RN_DEPENDENCIES',
    // versioned rn postinstall hooks read from template files
    'PODFILE_VERSIONED_POSTINSTALLS',
    // list of generated Expo subspecs to include under a versioned react native dependency
    'REACT_NATIVE_EXPO_SUBSPECS',
    // path to use for the unversioned react native dependency
    'REACT_NATIVE_PATH',
    // name of the main build target, e.g. Exponent
    'TARGET_NAME',
    // path from Podfile to versioned-react-native
    'VERSIONED_REACT_NATIVE_PATH',
  ];

  for (const key in substitutions) {
    if (substitutions.hasOwnProperty(key)) {
      if (!validKeys.includes(key)) {
        throw new Error(`Unrecognized Podfile template key: ${key}`);
      }
    }
  }
  return true;
}

function _renderExpoKitDependency(options, sdkVersion) {
  const sdkMajorVersion = parseSdkMajorVersion(sdkVersion);
  let attributes;
  if (options.expoKitPath) {
    attributes = {
      path: options.expoKitPath,
    };
  } else if (options.expoKitTag) {
    attributes = {
      git: 'http://github.com/expo/expo.git',
      tag: options.expoKitTag,
    };
  } else {
    attributes = {
      git: 'http://github.com/expo/expo.git',
      branch: 'master',
    };
  }

  // GL subspec is available as of SDK 26
  if (sdkMajorVersion < 26) {
    attributes.subspecs = ['Core', 'CPP'];
  } else {
    attributes.subspecs = ['Core', 'CPP', 'GL'];
  }

  let dependency = `pod 'ExpoKit',
${indentString(_renderDependencyAttributes(attributes), 2)}`;

  return indentString(dependency, 2);
}

/**
 * @param sdkVersion if specified, indicates which sdkVersion this project uses
 *  as 'UNVERSIONED', e.g. if we are detaching a sdk15 project, we render
 *  an unversioned dependency pointing at RN#sdk-15.
 */
function _renderUnversionedReactNativeDependency(options, sdkVersion) {
  let sdkMajorVersion = parseSdkMajorVersion(sdkVersion);
  if (sdkMajorVersion < 21) {
    return indentString(
      `
${_renderUnversionedReactDependency(options, sdkVersion)}
${_renderUnversionedYogaDependency(options, sdkVersion)}
`,
      2
    );
  } else {
    const glogLibraryName = (sdkMajorVersion < 26)
          ? 'GLog'
          : 'glog';
    return indentString(
      `
${_renderUnversionedReactDependency(options, sdkVersion)}
${_renderUnversionedYogaDependency(options, sdkVersion)}
${_renderUnversionedThirdPartyDependency(
        'DoubleConversion',
        path.join('third-party-podspecs', 'DoubleConversion.podspec'),
        options
      )}
${_renderUnversionedThirdPartyDependency(
        'Folly',
        path.join('third-party-podspecs', 'Folly.podspec'),
        options
      )}
${_renderUnversionedThirdPartyDependency(
        glogLibraryName,
        path.join('third-party-podspecs', `${glogLibraryName}.podspec`),
        options
      )}
`,
      2
    );
  }
}

function _renderUnversionedReactDependency(options, sdkVersion) {
  let attributes;
  if (options.reactNativePath) {
    attributes = {
      path: options.reactNativePath,
    };
  } else {
    throw new Error(`Unsupported options for RN dependency: ${options}`);
  }

  attributes.subspecs = [
    'Core',
    'ART',
    'RCTActionSheet',
    'RCTAnimation',
    'RCTCameraRoll',
    'RCTGeolocation',
    'RCTImage',
    'RCTNetwork',
    'RCTText',
    'RCTVibration',
    'RCTWebSocket',
  ];

  let sdkMajorVersion = parseSdkMajorVersion(sdkVersion);
  if (!(sdkMajorVersion < 16)) {
    attributes.subspecs.push('DevSupport');
  }
  if (!(sdkMajorVersion < 21)) {
    attributes.subspecs.push('CxxBridge');
  } else if (!(sdkMajorVersion < 18)) {
    attributes.subspecs.push('BatchedBridge');
  }

  return `pod 'React',
${indentString(_renderDependencyAttributes(attributes), 2)}`;
}

function _renderUnversionedYogaDependency(options, sdkVersion) {
  let attributes;
  let sdkMajorVersion = parseSdkMajorVersion(sdkVersion);
  if (options.reactNativePath) {
    attributes = {
      path: path.join(
        options.reactNativePath,
        'ReactCommon',
        sdkMajorVersion < 22 ? 'Yoga' : 'yoga'
      ),
    };
  } else {
    throw new Error(`Unsupported options for Yoga dependency: ${options}`);
  }
  return `pod '${sdkMajorVersion < 22 ? 'Yoga' : 'yoga'}',
${indentString(_renderDependencyAttributes(attributes), 2)}`;
}

function _renderUnversionedThirdPartyDependency(podName, podspecRelativePath, options) {
  let attributes;
  if (options.reactNativePath) {
    attributes = {
      podspec: path.join(options.reactNativePath, podspecRelativePath),
      inhibit_warnings: true,
    };
  } else {
    throw new Error(`Unsupported options for ${podName} dependency: ${options}`);
  }
  return `pod '${podName}',
${indentString(_renderDependencyAttributes(attributes), 2)}`;
}

function _renderDependencyAttributes(attributes) {
  let attributesStrings = [];
  for (let key of Object.keys(attributes)) {
    let value = JSON.stringify(attributes[key], null, 2);
    attributesStrings.push(`:${key} => ${value}`);
  }
  return attributesStrings.join(',\n');
}

async function _renderVersionedReactNativeDependenciesAsync(
  templatesDirectory,
  versionedReactNativePath,
  expoSubspecs
) {
  let result = await _concatTemplateFilesInDirectoryAsync(
    path.join(templatesDirectory, 'versioned-react-native', 'dependencies')
  );
  expoSubspecs = expoSubspecs.map(subspec => `'${subspec}'`).join(', ');
  result = result.replace(/\$\{VERSIONED_REACT_NATIVE_PATH\}/g, versionedReactNativePath);
  result = result.replace(/\$\{REACT_NATIVE_EXPO_SUBSPECS\}/g, expoSubspecs);
  return result;
}

async function _renderVersionedReactNativePostinstallsAsync(templatesDirectory) {
  return _concatTemplateFilesInDirectoryAsync(
    path.join(templatesDirectory, 'versioned-react-native', 'postinstalls')
  );
}

async function _concatTemplateFilesInDirectoryAsync(directory) {
  let templateFilenames = await glob(path.join(directory, '*.rb'));
  let templateStrings = [];
  await Promise.all(
    templateFilenames.map(async filename => {
      let templateString = await fs.readFile(filename, 'utf8');
      if (templateString) {
        templateStrings.push(templateString);
      }
    })
  );
  return templateStrings.join('\n');
}

function _renderDetachedPostinstall(sdkVersion, isServiceContext) {
  let podsRootSub = '${PODS_ROOT}';
  const maybeDetachedServiceDef = (isServiceContext)
        ? `config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'EX_DETACHED_SERVICE=1'`
        : '';
  return `
    if target.pod_name == 'ExpoKit'
      target.native_target.build_configurations.each do |config|
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'EX_DETACHED=1'
        ${maybeDetachedServiceDef}
        # needed for GoogleMaps 2.x
        config.build_settings['FRAMEWORK_SEARCH_PATHS'] ||= []
        config.build_settings['FRAMEWORK_SEARCH_PATHS'] << '${podsRootSub}/GoogleMaps/Base/Frameworks'
        config.build_settings['FRAMEWORK_SEARCH_PATHS'] << '${podsRootSub}/GoogleMaps/Maps/Frameworks'
      end
    end
`;
}

function _renderUnversionedPostinstall() {
  // TODO: switch to `installer.pods_project.targets.each` in postinstall
  // see: https://stackoverflow.com/questions/37160688/set-deployment-target-for-cocoapodss-pod
  const podsToChangeDeployTarget = [
    'Amplitude-iOS',
    'Analytics',
    'AppAuth',
    'Branch',
    'CocoaLumberjack',
    'FBSDKCoreKit',
    'FBSDKLoginKit',
    'FBSDKShareKit',
    'GPUImage',
    'JKBigInteger2',
  ];
  const podsToChangeRB = `[${podsToChangeDeployTarget.map(pod => `'${pod}'`).join(',')}]`;
  return `
    if ${podsToChangeRB}.include? target.pod_name
      target.native_target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '9.0'
      end
    end
    # Build React Native with RCT_DEV enabled
    next unless target.pod_name == 'React'
    target.native_target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'RCT_DEV=1'
    end
`;
}

function _renderTestTarget(reactNativePath) {
  return `
  target 'ExponentIntegrationTests' do
    inherit! :search_paths
  end
`;
}

async function _renderPodDependenciesAsync(dependenciesConfigPath, options) {
  let dependencies = await new JsonFile(dependenciesConfigPath).readAsync();
  const type = options.isPodfile ? 'pod' : 'ss.dependency';
  const noWarningsFlag = options.isPodfile ? `, :inhibit_warnings => true` : '';
  let depsStrings = dependencies.map(
    dependency => `  ${type} '${dependency.name}', '${dependency.version}'${noWarningsFlag}`
  );
  return depsStrings.join('\n');
}

async function renderExpoKitPodspecAsync(pathToTemplate, pathToOutput, moreSubstitutions) {
  let templatesDirectory = path.dirname(pathToTemplate);
  let templateString = await fs.readFile(pathToTemplate, 'utf8');
  let dependencies = await _renderPodDependenciesAsync(
    path.join(templatesDirectory, 'dependencies.json'),
    { isPodfile: false }
  );
  let result = templateString.replace(/\$\{IOS_EXPOKIT_DEPS\}/g, indentString(dependencies, 2));
  if (moreSubstitutions && moreSubstitutions.IOS_EXPONENT_CLIENT_VERSION) {
    result = result.replace(
      /\$\{IOS_EXPONENT_CLIENT_VERSION\}/g,
      moreSubstitutions.IOS_EXPONENT_CLIENT_VERSION
    );
  }

  await fs.writeFile(pathToOutput, result);
}

/**
 *  @param pathToTemplate path to template Podfile
 *  @param pathToOutput path to render final Podfile
 *  @param moreSubstitutions dictionary of additional substitution keys and values to replace
 *         in the template, such as: TARGET_NAME, REACT_NATIVE_PATH
 */
async function renderPodfileAsync(
  pathToTemplate,
  pathToOutput,
  moreSubstitutions,
  sdkVersion = 'UNVERSIONED'
) {
  if (!moreSubstitutions) {
    moreSubstitutions = {};
  }
  let templatesDirectory = path.dirname(pathToTemplate);
  let templateString = await fs.readFile(pathToTemplate, 'utf8');

  let reactNativePath = moreSubstitutions.REACT_NATIVE_PATH;
  let rnDependencyOptions;
  if (reactNativePath) {
    rnDependencyOptions = { reactNativePath };
  } else {
    rnDependencyOptions = {};
  }

  const expoKitPath = moreSubstitutions.EXPOKIT_PATH;
  const expoKitTag = moreSubstitutions.EXPOKIT_TAG;
  let expoKitDependencyOptions = {};
  if (expoKitPath) {
    expoKitDependencyOptions = { expoKitPath };
  } else if (expoKitTag) {
    expoKitDependencyOptions = { expoKitTag };
  }

  let versionedRnPath = moreSubstitutions.VERSIONED_REACT_NATIVE_PATH;
  if (!versionedRnPath) {
    versionedRnPath = './versioned-react-native';
  }
  let rnExpoSubspecs = moreSubstitutions.REACT_NATIVE_EXPO_SUBSPECS;
  if (!rnExpoSubspecs) {
    rnExpoSubspecs = ['Expo'];
  }

  let versionedDependencies = await _renderVersionedReactNativeDependenciesAsync(
    templatesDirectory,
    versionedRnPath,
    rnExpoSubspecs
  );
  let versionedPostinstalls = await _renderVersionedReactNativePostinstallsAsync(
    templatesDirectory
  );
  let podDependencies = await _renderPodDependenciesAsync(
    path.join(templatesDirectory, 'dependencies.json'),
    { isPodfile: true }
  );

  let substitutions = {
    EXPONENT_CLIENT_DEPS: podDependencies,
    EXPOKIT_DEPENDENCY: _renderExpoKitDependency(expoKitDependencyOptions, sdkVersion),
    PODFILE_UNVERSIONED_RN_DEPENDENCY: _renderUnversionedReactNativeDependency(
      rnDependencyOptions,
      sdkVersion
    ),
    PODFILE_UNVERSIONED_POSTINSTALL: _renderUnversionedPostinstall(),
    PODFILE_DETACHED_POSTINSTALL: _renderDetachedPostinstall(sdkVersion, false),
    PODFILE_DETACHED_SERVICE_POSTINSTALL: _renderDetachedPostinstall(sdkVersion, true),
    PODFILE_VERSIONED_RN_DEPENDENCIES: versionedDependencies,
    PODFILE_VERSIONED_POSTINSTALLS: versionedPostinstalls,
    PODFILE_TEST_TARGET: _renderTestTarget(reactNativePath),
    ...moreSubstitutions,
  };
  _validatePodfileSubstitutions(substitutions);

  let result = templateString;
  for (let key in substitutions) {
    if (substitutions.hasOwnProperty(key)) {
      let replacement = substitutions[key];
      result = result.replace(new RegExp(`\\\$\\\{${key}\\\}`, 'g'), replacement);
    }
  }

  await fs.writeFile(pathToOutput, result);
}

export { renderExpoKitPodspecAsync, renderPodfileAsync };
