// Copyright 2015-present 650 Industries. All rights reserved.

'use strict';

import fs from 'fs';
import 'instapromise';

async function renderPodfileAsync(targetName, pathToTemplate, pathToOutput) {
  // TODO: make this work on the main iOS client repo as well
  let templateString = await fs.promise.readFile(pathToTemplate, 'utf8');

  let substitutions = {
    TARGET_NAME: targetName,
    PODFILE_UNVERSIONED_RN_DEPENDENCY: renderUnversionedReactNativeDependency({ isRemote: true, remoteSdkVersion: '12.0.0' }),
    PODFILE_UNVERSIONED_POSTINSTALL: renderUnversionedPostinstall(),
    PODFILE_VERSIONED_RN_DEPENDENCIES: '',
    PODFILE_VERSIONED_POSTINSTALLS: '',
  };

  let result = templateString;
  for (let key in substitutions) {
    if (substitutions.hasOwnProperty(key)) {
      let replacement = substitutions[key];
      result = result.replace(new RegExp(`\\\$\\\{${key}\\\}`, 'g'), replacement);
    }
  }
  
  await fs.promise.writeFile(pathToOutput, result);
}

async function renderExponentViewPodspecAsync(pathToTemplate, pathToOutput) {
  // TODO: make generate-dynamic-macros put ExponentView.podspec back under exponent (and gitignore)
  let templateString = await fs.promise.readFile(pathToTemplate, 'utf8');
  let dependencies = renderPodDependencies({ isPodfile: false });
  let result = templateString.replace(/\$\{IOS_EXPONENT_VIEW_DEPS\}/g, dependencies);
  
  await fs.promise.writeFile(pathToOutput, result);
}

function renderUnversionedReactNativeDependency(options) {
  // TODO: extend this to work with iOS client and rn-lab
  if (options.isRemote && options.remoteSdkVersion) {
    let remoteTag = `sdk-${options.remoteSdkVersion}`;
    return `
  pod 'React',
      :git => 'https://github.com/exponentjs/react-native.git',
      :tag => '${remoteTag}',
      :subspecs => [
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
      ]
`;
  } else {
    throw new Error(`Unsupported options for RN dependency: ${options}`);
  }
}

function renderVersionedReactNativeDependency(version, parentDirectory) {
  // TODO: create template-files/ios/versioned-react-native/<VERSION>-dependency.template
  // and have the versioning script write/remove that file.
}

function renderVersionedReactNativePostinstall(version) {
  // TODO: create template-files/ios/versioned-react-native/<VERSION>-postinstall.template
  // and have the versioning script write/remove that file.
}

function renderUnversionedPostinstall() {
  return `
    # Build React Native with RCT_DEV enabled
    next unless target.pod_name == 'React'
    target.native_target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'RCT_DEV=1'
    end
`;
}

function renderPodDependencies(options) {
  let dependencies = [
    { name: 'AppAuth', version: '~> 0.4' },
    { name: 'CocoaLumberjack', version: '~> 2.3' },
    { name: 'Crashlytics', version: '~> 3.8' },
    { name: 'Fabric', version: '~> 1.6' },
    { name: 'Google/SignIn', version: '~> 3.0' },
    { name: 'Amplitude-iOS', version: '~> 3.8' },
    { name: 'FBSDKCoreKit', version: '~> 4.15' },
    { name: 'FBSDKLoginKit', version: '~> 4.15' },
    { name: 'FBSDKShareKit', version: '~> 4.15' },
    { name: 'Analytics', version: '~> 3.5' },
  ];

  let type = (options.isPodfile) ? 'pod' : 's.dependency';
  let depsStrings = dependencies.map((dependency) => `  ${type} '${dependency.name}', '${dependency.version}'`);
  return depsStrings.join('\n');
}

export {
  renderExponentViewPodspecAsync,
  renderPodfileAsync,
};

/*

main exponent podfile:

(beginning cruft)
- pods
- exponentcpp
- unversioned react rn-lab
- versioned reacts (in subdirectories)
- versioned postinstalls
- unversioned postinstall
- rcttest
(end)

*/
