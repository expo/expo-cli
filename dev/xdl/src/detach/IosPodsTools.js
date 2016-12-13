// Copyright 2015-present 650 Industries. All rights reserved.

'use strict';

import fs from 'fs';
import glob from 'glob';
import 'instapromise';
import JsonFile from '@exponent/json-file';
import path from 'path';
import * as Versions from '../Versions';

/**
 *  @param pathToTemplate path to template Podfile
 *  @param pathToOutput path to render final Podfile
 *  @param moreSubstitutions dictionary of additional substitution keys and values to replace
 *         in the template, such as: TARGET_NAME, EXPONENT_ROOT_PATH, REACT_NATIVE_PATH
 */
async function renderPodfileAsync(pathToTemplate, pathToOutput, moreSubstitutions) {
  if (!moreSubstitutions) {
    moreSubstitutions = {};
  }
  let templatesDirectory = path.dirname(pathToTemplate);
  let templateString = await fs.promise.readFile(pathToTemplate, 'utf8');
  let newestVersion = await Versions.newestSdkVersionAsync();

  let reactNativePath = moreSubstitutions.REACT_NATIVE_PATH;
  let rnDependencyOptions;
  if (reactNativePath) {
    rnDependencyOptions = { reactNativePath };
  } else {
    rnDependencyOptions = {
      isRemote: true,
      remoteTag: newestVersion.exponentReactNativeTag,
    };
  }

  let versionedDependencies = await renderVersionedReactNativeDependenciesAsync(templatesDirectory);
  let versionedPostinstalls = await renderVersionedReactNativePostinstallsAsync(templatesDirectory);
  let podDependencies = await renderPodDependenciesAsync(
    path.join(templatesDirectory, 'dependencies.json'),
    { isPodfile: true }
  );

  let substitutions = {
    EXPONENT_CLIENT_DEPS: podDependencies,
    PODFILE_UNVERSIONED_RN_DEPENDENCY: renderUnversionedReactNativeDependency(rnDependencyOptions),
    PODFILE_UNVERSIONED_POSTINSTALL: renderUnversionedPostinstall(),
    PODFILE_DETACHED_POSTINSTALL: renderDetachedPostinstall(),
    PODFILE_VERSIONED_RN_DEPENDENCIES: versionedDependencies,
    PODFILE_VERSIONED_POSTINSTALLS: versionedPostinstalls,
    PODFILE_TEST_TARGET: renderPodfileTestTarget(reactNativePath),
    ...moreSubstitutions,
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

async function renderExponentViewPodspecAsync(pathToTemplate, pathToOutput, moreSubstitutions) {
  let templatesDirectory = path.dirname(pathToTemplate);
  let templateString = await fs.promise.readFile(pathToTemplate, 'utf8');
  let dependencies = await renderPodDependenciesAsync(
    path.join(templatesDirectory, 'dependencies.json'),
    { isPodfile: false }
  );
  let result = templateString.replace(/\$\{IOS_EXPONENT_VIEW_DEPS\}/g, dependencies);
  if (moreSubstitutions && moreSubstitutions.IOS_EXPONENT_CLIENT_VERSION) {
    result = result.replace(/\$\{IOS_EXPONENT_CLIENT_VERSION\}/g, moreSubstitutions.IOS_EXPONENT_CLIENT_VERSION);
  }
  
  await fs.promise.writeFile(pathToOutput, result);
}

function renderUnversionedReactNativeDependency(options) {
  let attributes;
  if (options.isRemote && options.remoteTag) {
    attributes = {
      git: 'https://github.com/exponentjs/react-native.git',
      tag: options.remoteTag,
    };
  } else if (options.reactNativePath) {
    attributes = {
      path: options.reactNativePath,
    };
  } else {
    throw new Error(`Unsupported options for RN dependency: ${options}`);
  }
  let attributesStrings = [];
  for (let key in attributes) {
    if (attributes.hasOwnProperty(key)) {
      attributesStrings.push(`    :${key} => '${attributes[key]}',\n`);
    }
  }
  attributes = attributesStrings.join('');
  return `
  pod 'React',
${attributes}
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
}

async function renderVersionedReactNativeDependenciesAsync(templatesDirectory) {
  // TODO: write these files with versioning script
  return concatTemplateFilesInDirectoryAsync(path.join(templatesDirectory, 'versioned-react-native', 'dependencies'));
}

async function renderVersionedReactNativePostinstallsAsync(templatesDirectory) {
  // TODO: write these files with versioning script
  return concatTemplateFilesInDirectoryAsync(path.join(templatesDirectory, 'versioned-react-native', 'postinstalls'));
}

async function concatTemplateFilesInDirectoryAsync(directory) {
  let templateFilenames = await glob.promise(path.join(directory, '*.rb'));
  let templateStrings = [];
  await Promise.all(templateFilenames.map(async (filename) => {
    let templateString = await fs.promise.readFile(filename, 'utf8');
    if (templateString) {
      templateStrings.push(templateString);
    }
  }));
  return templateStrings.join('\n');
}

function renderDetachedPostinstall() {
  return `
    if target.pod_name == 'ExponentView'
      target.native_target.build_configurations.each do |config|
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'EX_DETACHED=1'
      end
    end
`;
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

function renderPodfileTestTarget(reactNativePath) {
  return `
  # if you run into problems pre-downloading this, rm Pods/Local\ Podspecs/RCTTest.podspec.json
  target 'ExponentIntegrationTests' do
    inherit! :search_paths
    pod 'RCTTest', :podspec => './RCTTest.podspec', :path => '${reactNativePath}'
  end
`;
}

async function renderPodDependenciesAsync(dependenciesConfigPath, options) {
  let dependencies = await new JsonFile(dependenciesConfigPath).readAsync();
  let type = (options.isPodfile) ? 'pod' : 's.dependency';
  let depsStrings = dependencies.map((dependency) => `  ${type} '${dependency.name}', '${dependency.version}'`);
  return depsStrings.join('\n');
}

export {
  renderExponentViewPodspecAsync,
  renderPodfileAsync,
};
