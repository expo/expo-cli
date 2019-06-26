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
    // Expo universal modules dependencies
    'PODFILE_UNVERSIONED_EXPO_MODULES_DEPENDENCIES',
    // Universal modules configurations to be included in the Podfile
    'UNIVERSAL_MODULES',
    // Relative path from iOS project directory to folder where unimodules are installed.
    'UNIVERSAL_MODULES_PATH',
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
  // but removed together with CPP subspec in SDK 29
  if (sdkMajorVersion < 26) {
    attributes.subspecs = ['Core', 'CPP'];
  } else if (sdkMajorVersion < 29 && !process.env.EXPO_UNIVERSE_DIR) {
    attributes.subspecs = ['Core', 'CPP', 'GL'];
  } else {
    attributes.subspecs = ['Core'];
  }
  attributes.inhibit_warnings = true;

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
  const glogLibraryName = sdkMajorVersion < 26 ? 'GLog' : 'glog';
  return indentString(
    `
${_renderUnversionedReactDependency(options, sdkVersion)}
${_renderUnversionedYogaDependency(options)}
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

function _renderUnversionedReactDependency(options, sdkVersion) {
  if (!options.reactNativePath) {
    throw new Error(`Unsupported options for RN dependency: ${options}`);
  }
  let attributes = {
    path: options.reactNativePath,
    inhibit_warnings: true,
    subspecs: [
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
      'DevSupport',
      'CxxBridge',
    ],
  };
  return `pod 'React',
${indentString(_renderDependencyAttributes(attributes), 2)}`;
}

function _renderUnversionedYogaDependency(options) {
  let attributes;
  if (options.reactNativePath) {
    attributes = {
      path: path.join(options.reactNativePath, 'ReactCommon', 'yoga'),
      inhibit_warnings: true,
    };
  } else {
    throw new Error(`Unsupported options for Yoga dependency: ${options}`);
  }
  return `pod 'yoga',
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

function createSdkFilterFn(sdkVersion) {
  if (sdkVersion && String(sdkVersion).toUpperCase() === 'UNVERSIONED') {
    return () => false;
  }
  if (sdkVersion === undefined || !sdkVersion.match(/^\d+\.\d+.\d+$/)) {
    return;
  }
  const sdkVersionWithUnderscores = sdkVersion.replace(/\./g, '_');
  return i => i.endsWith(`/ReactABI${sdkVersionWithUnderscores}.rb`);
}

async function _renderVersionedReactNativeDependenciesAsync(
  templatesDirectory,
  versionedReactNativePath,
  expoSubspecs,
  shellAppSdkVersion
) {
  const filterFn = createSdkFilterFn(shellAppSdkVersion);
  let result = await _concatTemplateFilesInDirectoryAsync(
    path.join(templatesDirectory, 'versioned-react-native', 'dependencies'),
    filterFn
  );
  expoSubspecs = expoSubspecs.map(subspec => `'${subspec}'`).join(', ');
  result = result.replace(/\$\{VERSIONED_REACT_NATIVE_PATH\}/g, versionedReactNativePath);
  result = result.replace(/\$\{REACT_NATIVE_EXPO_SUBSPECS\}/g, expoSubspecs);
  return result;
}

async function _renderVersionedReactNativePostinstallsAsync(
  templatesDirectory,
  shellAppSdkVersion
) {
  const filterFn = createSdkFilterFn(shellAppSdkVersion);
  return _concatTemplateFilesInDirectoryAsync(
    path.join(templatesDirectory, 'versioned-react-native', 'postinstalls'),
    filterFn
  );
}

async function _concatTemplateFilesInDirectoryAsync(directory, filterFn) {
  let templateFilenames = (await glob(path.join(directory, '*.rb'))).sort();
  let filteredTemplateFilenames = filterFn ? templateFilenames.filter(filterFn) : templateFilenames;
  let templateStrings = [];
  // perform this in series in order to get deterministic output
  for (let fileIdx = 0, nFiles = filteredTemplateFilenames.length; fileIdx < nFiles; fileIdx++) {
    const filename = filteredTemplateFilenames[fileIdx];
    let templateString = await fs.readFile(filename, 'utf8');
    if (templateString) {
      templateStrings.push(templateString);
    }
  }
  return templateStrings.join('\n');
}

function _renderDetachedPostinstall(sdkVersion, isServiceContext) {
  const sdkMajorVersion = parseSdkMajorVersion(sdkVersion);
  const podNameExpression = sdkMajorVersion < 33 ? 'target.pod_name' : 'pod_name';
  const targetExpression = sdkMajorVersion < 33 ? 'target' : 'target_installation_result';

  let podsRootSub = '${PODS_ROOT}';
  const maybeDetachedServiceDef = isServiceContext
    ? `config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'EX_DETACHED_SERVICE=1'`
    : '';

  const maybeFrameworkSearchPathDef =
    sdkMajorVersion < 33
      ? `
          # Needed for GoogleMaps 2.x
          config.build_settings['FRAMEWORK_SEARCH_PATHS'] ||= []
          config.build_settings['FRAMEWORK_SEARCH_PATHS'] << '${podsRootSub}/GoogleMaps/Base/Frameworks'
          config.build_settings['FRAMEWORK_SEARCH_PATHS'] << '${podsRootSub}/GoogleMaps/Maps/Frameworks'`
      : '';
  return `
      if ${podNameExpression} == 'ExpoKit'
        ${targetExpression}.native_target.build_configurations.each do |config|
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'EX_DETACHED=1'
          ${maybeDetachedServiceDef}
          # Enable Google Maps support
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'HAVE_GOOGLE_MAPS=1'
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'HAVE_GOOGLE_MAPS_UTILS=1'
          ${maybeFrameworkSearchPathDef}
        end
      end
`;
}

function _renderUnversionedPostinstall(sdkVersion) {
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
  const sdkMajorVersion = parseSdkMajorVersion(sdkVersion);
  const podNameExpression = sdkMajorVersion < 33 ? 'target.pod_name' : 'pod_name';
  const targetExpression = sdkMajorVersion < 33 ? 'target' : 'target_installation_result';

  // SDK31 drops support for iOS 9.0
  const deploymentTarget = sdkMajorVersion > 30 ? '10.0' : '9.0';

  const podsToChangeDeployTargetIfStart =
    sdkMajorVersion <= 33 ? `      if ${podsToChangeRB}.include? ${podNameExpression}` : '';
  const podsToChangeDeployTargetIfEnd = sdkMajorVersion <= 33 ? '      end' : '';

  return `
${podsToChangeDeployTargetIfStart}
      ${targetExpression}.native_target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${deploymentTarget}'
      end
${podsToChangeDeployTargetIfEnd}

      # Can't specify this in the React podspec because we need to use those podspecs for detached
      # projects which don't reference ExponentCPP.
      if ${podNameExpression}.start_with?('React')
        ${targetExpression}.native_target.build_configurations.each do |config|
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${deploymentTarget}'
          config.build_settings['HEADER_SEARCH_PATHS'] ||= ['$(inherited)']
        end
      end

      # Build React Native with RCT_DEV enabled and RCT_ENABLE_INSPECTOR and
      # RCT_ENABLE_PACKAGER_CONNECTION disabled
      next unless ${podNameExpression} == 'React'
      ${targetExpression}.native_target.build_configurations.each do |config|
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'RCT_DEV=1'
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'RCT_ENABLE_INSPECTOR=0'
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'ENABLE_PACKAGER_CONNECTION=0'
      end
`;
}

function _renderTestTarget(reactNativePath) {
  return `
  target 'ExponentIntegrationTests' do
    inherit! :search_paths
  end

  target 'Tests' do
    inherit! :search_paths
  end
`;
}

async function _renderPodDependenciesAsync(dependenciesConfigPath, options) {
  let dependencies = await new JsonFile(dependenciesConfigPath).readAsync();
  const type = options.isPodfile ? 'pod' : 'ss.dependency';
  const noWarningsFlag = options.isPodfile ? `, :inhibit_warnings => true` : '';
  let depsStrings = dependencies.map(dependency => {
    let builder = '';
    if (dependency.comments) {
      builder += dependency.comments.map(commentLine => `  # ${commentLine}`).join('\n');
      builder += '\n';
    }
    builder += `  ${type} '${dependency.name}', '${dependency.version}'${noWarningsFlag}`;
    return builder;
  });
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

function _renderUnversionedUniversalModulesDependencies(
  universalModules,
  universalModulesPath,
  sdkVersion
) {
  const sdkMajorVersion = parseSdkMajorVersion(sdkVersion);

  if (sdkMajorVersion >= 33) {
    return indentString(
      `
# Install unimodules
require_relative '../node_modules/react-native-unimodules/cocoapods.rb'
use_unimodules!(
  modules_paths: ['${universalModulesPath}'],
  exclude: [
    'expo-face-detector',
    'expo-payments-stripe',
  ],
)`,
      2
    );
  } else {
    return indentString(
      universalModules
        .map(moduleInfo =>
          _renderUnversionedUniversalModuleDependency(
            moduleInfo.podName,
            moduleInfo.path,
            sdkVersion
          )
        )
        .join('\n'),
      2
    );
  }
}

function _renderUnversionedUniversalModuleDependency(podName, path, sdkVersion) {
  const attributes = {
    path,
  };
  return `pod '${podName}',
${indentString(_renderDependencyAttributes(attributes), 2)}`;
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
  shellAppSdkVersion,
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
    rnExpoSubspecs,
    shellAppSdkVersion
  );
  let versionedPostinstalls = await _renderVersionedReactNativePostinstallsAsync(
    templatesDirectory,
    shellAppSdkVersion
  );
  let podDependencies = await _renderPodDependenciesAsync(
    path.join(templatesDirectory, 'dependencies.json'),
    { isPodfile: true }
  );

  let universalModules = moreSubstitutions.UNIVERSAL_MODULES;
  if (!universalModules) {
    universalModules = [];
  }

  let substitutions = {
    EXPONENT_CLIENT_DEPS: podDependencies,
    EXPOKIT_DEPENDENCY: _renderExpoKitDependency(expoKitDependencyOptions, sdkVersion),
    PODFILE_UNVERSIONED_EXPO_MODULES_DEPENDENCIES: _renderUnversionedUniversalModulesDependencies(
      universalModules,
      moreSubstitutions.UNIVERSAL_MODULES_PATH,
      sdkVersion
    ),
    PODFILE_UNVERSIONED_RN_DEPENDENCY: _renderUnversionedReactNativeDependency(
      rnDependencyOptions,
      sdkVersion
    ),
    PODFILE_UNVERSIONED_POSTINSTALL: _renderUnversionedPostinstall(sdkVersion),
    PODFILE_DETACHED_POSTINSTALL: _renderDetachedPostinstall(sdkVersion, false),
    PODFILE_DETACHED_SERVICE_POSTINSTALL: _renderDetachedPostinstall(sdkVersion, true),
    PODFILE_VERSIONED_RN_DEPENDENCIES: versionedDependencies,
    PODFILE_VERSIONED_POSTINSTALLS: versionedPostinstalls,
    PODFILE_TEST_TARGET: shellAppSdkVersion ? '' : _renderTestTarget(reactNativePath),
    ...moreSubstitutions,
  };
  _validatePodfileSubstitutions(substitutions);

  let result = templateString;
  for (let key in substitutions) {
    if (substitutions.hasOwnProperty(key)) {
      let replacement = substitutions[key];
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), replacement);
    }
  }

  await fs.writeFile(pathToOutput, result);
}

export { renderExpoKitPodspecAsync, renderPodfileAsync };
